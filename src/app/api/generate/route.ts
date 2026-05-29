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

  // 2. Parse and validate body.
  // Expected fields:
  //  - prompt_raw       (string, required): user's original input
  //  - prompt_effective (string, required): final prompt sent to AI (may include traits)
  //  - character_id     (string | null, optional)
  //  - traits_included  (boolean, required): whether traits were prepended
  let promptRaw: string
  let promptEffective: string
  let traitsIncluded: boolean
  let rawCharacterId: unknown
  try {
    const body = (await request.json()) as {
      prompt_raw?: unknown
      prompt_effective?: unknown
      character_id?: unknown
      traits_included?: unknown
    }
    if (
      typeof body.prompt_raw !== 'string' ||
      typeof body.prompt_effective !== 'string'
    ) {
      return NextResponse.json(
        { error: 'Prompt is required.' },
        { status: 400 }
      )
    }
    if (typeof body.traits_included !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid request body.' },
        { status: 400 }
      )
    }
    promptRaw = body.prompt_raw.trim()
    promptEffective = body.prompt_effective.trim()
    traitsIncluded = body.traits_included
    rawCharacterId = body.character_id
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body.' },
      { status: 400 }
    )
  }

  if (promptRaw.length === 0 || promptEffective.length === 0) {
    return NextResponse.json(
      { error: 'Prompt cannot be empty.' },
      { status: 400 }
    )
  }

  // Effective prompt can be longer than raw (traits prepended)
  if (promptEffective.length > 1000) {
    return NextResponse.json(
      { error: 'Prompt is too long.' },
      { status: 400 }
    )
  }

  // 2b. Validate character_id if provided.
  let characterId: string | null = null
  if (rawCharacterId !== undefined && rawCharacterId !== null) {
    if (typeof rawCharacterId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid character.' },
        { status: 400 }
      )
    }

    const { data: characterRow, error: characterLookupError } = await supabase
      .from('characters')
      .select('id')
      .eq('id', rawCharacterId)
      .maybeSingle()

    if (characterLookupError) {
      console.error('Character lookup failed:', characterLookupError)
      return NextResponse.json(
        { error: 'Failed to verify character. Please try again.' },
        { status: 500 }
      )
    }

    if (!characterRow) {
      return NextResponse.json(
        {
          error:
            'The selected character is no longer available. Please refresh and try again.',
        },
        { status: 400 }
      )
    }

    characterId = rawCharacterId
  }

  // 2c. Sanity check: traits_included = true must imply a character is selected.
  // The client UI prevents this state, but never trust the client.
  if (traitsIncluded && !characterId) {
    return NextResponse.json(
      {
        error:
          'Invalid request: traits cannot be included without a character.',
      },
      { status: 400 }
    )
  }

  // 3. Replicate token check
  const replicateToken = process.env.REPLICATE_API_TOKEN
  if (!replicateToken) {
    console.error('REPLICATE_API_TOKEN is not configured.')
    return NextResponse.json(
      { error: 'Server is not configured for image generation.' },
      { status: 500 }
    )
  }

 // House style applied to every base generation: clean full-body humanoid.
  // Stored prompts (promptRaw/promptEffective) stay clean — this is render plumbing only.
 // Lead with strong full-body framing so flux doesn't crop to a half-body portrait.
  const FRAMING =
    'Full-body photograph, the entire figure visible from head to toe with both feet and shoes shown, full-length wide shot, the whole standing body fits within the frame.'
  const STYLE =
    'Standing upright in a relaxed natural pose, facing the camera. Photorealistic, soft studio lighting, clean plain neutral background.'
  const renderPrompt = `${FRAMING} ${promptEffective}. ${STYLE}`

  // 4. Call Replicate (flux-1.1-pro) in sync mode via the `Prefer: wait` header.
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
            prompt: renderPrompt,
            aspect_ratio: '2:3',
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
      // 5. Download the image from Replicate (URL expires in 1 hour — must persist now)
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

      // 7. Permanent public URL
      const { data: publicUrlData } = supabase.storage
        .from('generations')
        .getPublicUrl(filePath)
      const permanentImageUrl = publicUrlData.publicUrl

      // 8. Atomic INSERT via RPC — generation + creative_contribution in one transaction.
      // If the RPC fails, BOTH inserts are rolled back automatically (PL/pgSQL transaction).
      // The Storage image becomes orphan in that case — acceptable for beta; a future
      // drift-check job can clean up orphans by listing storage and comparing to DB.
      const { error: rpcError } = await supabase.rpc(
        'create_generation_with_contribution',
        {
          p_prompt_raw: promptRaw,
          p_prompt_effective: promptEffective,
          p_image_url: permanentImageUrl,
          p_prediction_id: prediction.id,
          p_character_id: characterId,
          p_traits_included: traitsIncluded,
        }
      )

      if (rpcError) {
        console.error('Failed to save generation + contribution:', rpcError)
        return NextResponse.json(
          { error: 'Failed to save your generation. Please try again.' },
          { status: 502 }
        )
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

    // Still processing after the `Prefer: wait` timeout
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
