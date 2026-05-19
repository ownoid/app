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
    // Accept either form so the code stays robust if we swap models again.
    let imageUrl: string | null = null
    if (typeof prediction.output === 'string' && prediction.output.length > 0) {
      imageUrl = prediction.output
    } else if (
      Array.isArray(prediction.output) &&
      prediction.output.length > 0 &&
      typeof prediction.output[0] === 'string'
    ) {
      imageUrl = prediction.output[0]
    }

    if (prediction.status === 'succeeded' && imageUrl) {
      // 5. Save the generation to the database (best-effort).
      // RLS policy "Users can insert own generations" requires user_id === auth.uid(),
      // which is automatically satisfied because we use the server client with the user's session.
      const { error: insertError } = await supabase
        .from('generations')
        .insert({
          user_id: user.id,
          prompt,
          image_url: imageUrl,
          prediction_id: prediction.id,
        })

      if (insertError) {
        // We don't fail the request — the image was already generated and paid for.
        // The user still gets their image; the missing row will show up in logs only.
        console.error('Failed to save generation to DB:', insertError)
      }

      return NextResponse.json({
        imageUrl,
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
