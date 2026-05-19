import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Force this route to run on the Node.js runtime
// (we use process.env.REPLICATE_API_TOKEN, which is server-only)
export const runtime = 'nodejs'

// Shape of the Replicate prediction response we care about.
// flux-1.1-pro returns `output` as a single string URL;
// flux-schnell returned it as a string[]. We accept both defensively.
type ReplicatePrediction = {
  id: string
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled'
  output: string | string[] | null
  error: string | null
}

export async function POST(request: NextRequest) {
  // 1. Auth check — only logged-in users can generate
  const supabase = createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: 'You must be logged in to generate images.' },
      { status: 401 }
    )
  }

  // 2. Parse and validate the prompt
  let prompt: string
  try {
    const body = (await request.json()) as { prompt?: unknown }
    if (typeof body.prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required.' },
        { status: 400 }
      )
    }
    prompt = body.prompt.trim()
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body.' },
      { status: 400 }
    )
  }

  if (prompt.length === 0) {
    return NextResponse.json(
      { error: 'Prompt cannot be empty.' },
      { status: 400 }
    )
  }

  if (prompt.length > 500) {
    return NextResponse.json(
      { error: 'Prompt is too long (max 500 characters).' },
      { status: 400 }
    )
  }

  // 3. Check that the Replicate token is configured
  const replicateToken = process.env.REPLICATE_API_TOKEN
  if (!replicateToken) {
    console.error('REPLICATE_API_TOKEN is not configured.')
    return NextResponse.json(
      { error: 'Server is not configured for image generation.' },
      { status: 500 }
    )
  }

  // 4. Call Replicate (flux-1.1-pro) in sync mode via the `Prefer: wait` header.
  // Note: flux-1.1-pro does NOT accept `num_outputs` — it always generates one image.
  try {
    const replicateResponse = await fetch(
      'https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro/predictions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${replicateToken}`,
          'Content-Type': 'application/json',
          Prefer: 'wait',
        },
        body: JSON.stringify({
          input: {
            prompt,
            aspect_ratio: '1:1',
            output_format: 'webp',
            output_quality: 90,
          },
        }),
      }
    )

    if (!replicateResponse.ok) {
      const errorText = await replicateResponse.text()
      console.error(
        'Replicate API error:',
        replicateResponse.status,
        errorText
      )
      return NextResponse.json(
        { error: 'Image generation failed.' },
        { status: 502 }
      )
    }

    const prediction = (await replicateResponse.json()) as ReplicatePrediction

    // Normalize output: flux-1.1-pro returns string, flux-schnell returned string[].
    let replicateImageUrl: string | null = null
    if (typeof prediction.output === 'string' && prediction.output.length > 0) {
      replicateImageUrl = prediction.output
    } else if (
      Array.isArray(prediction.output) &&
      prediction.output.length > 0 &&
      typeof prediction.output[0] === 'string'
    ) {
      replicateImageUrl = prediction.output[0]
    }

    if (prediction.status === 'succeeded' && replicateImageUrl) {
      // 5. Download the image from Replicate (URL expires in 1 hour — must persist it now).
      const imageResponse = await fetch(replicateImageUrl)
      if (!imageResponse.ok) {
        console.error(
          'Failed to download image from Replicate:',
          imageResponse.status
        )
        return NextResponse.json(
          { error: 'Failed to save generated image. Please try again.' },
          { status: 502 }
        )
      }
      const imageArrayBuffer = await imageResponse.arrayBuffer()

      // 6. Upload to Supabase Storage at <user_id>/<prediction_id>.webp
      // RLS policy "Users can upload to their own folder" requires the first folder
      // segment to equal auth.uid()::text — automatically satisfied by the server client.
      const filePath = `${user.id}/${prediction.id}.webp`
      const { error: uploadError } = await supabase.storage
        .from('generations')
        .upload(filePath, imageArrayBuffer, {
          contentType: 'image/webp',
          upsert: false,
        })

      if (uploadError) {
        console.error('Failed to upload image to Storage:', uploadError)
        return NextResponse.json(
          { error: 'Failed to save generated image. Please try again.' },
          { status: 502 }
        )
      }

      // 7. Get the permanent public URL
      const { data: publicUrlData } = supabase.storage
        .from('generations')
        .getPublicUrl(filePath)
      const permanentImageUrl = publicUrlData.publicUrl

      // 8. Save the generation to the database with the PERMANENT URL (not Replicate's).
      // Best-effort: if DB insert fails, the image is already uploaded — log and continue.
      const { error: insertError } = await supabase
        .from('generations')
        .insert({
          user_id: user.id,
          prompt,
          image_url: permanentImageUrl,
          prediction_id: prediction.id,
        })

      if (insertError) {
        console.error('Failed to save generation to DB:', insertError)
      }

      return NextResponse.json({
        imageUrl: permanentImageUrl,
        predictionId: prediction.id,
      })
    }

    if (prediction.status === 'failed' || prediction.status === 'canceled') {
      console.error('Prediction failed:', prediction.error)
      return NextResponse.json(
        { error: 'Image generation failed.' },
        { status: 502 }
      )
    }

    // Still processing after the `Prefer: wait` timeout — possible for flux-1.1-pro (4–5s)
    return NextResponse.json(
      {
        error: 'Image generation is taking too long. Please try again.',
        predictionId: prediction.id,
      },
      { status: 504 }
    )
  } catch (error) {
    console.error('Unexpected error during image generation:', error)
    return NextResponse.json(
      { error: 'Unexpected server error.' },
      { status: 500 }
    )
  }
}
