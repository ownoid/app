import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Force this route to run on the Node.js runtime
// (we use process.env.REPLICATE_API_TOKEN, which is server-only)
export const runtime = 'nodejs'

// Model identifier stored in generations.model for debugging/lineage.
const MODEL_NAME = 'flux-kontext-pro'

// Identity-preservation suffix. Validated in Replicate Playground:
// two consecutive edits kept face, hair, and body proportions intact.
// Keep this AFTER the user instruction — the edit is the subject, this is the constraint.
const IDENTITY_LOCK =
  'Keep the face, hairstyle, skin tone, and body proportions exactly the same.'

type ReplicatePrediction = {
  id: string
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled'
  output: string | string[] | null
  error: string | null
}

export async function POST(request: NextRequest) {
  // 1. Auth check
  const supabase = createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: 'You must be logged in to refine images.' },
      { status: 401 }
    )
  }

  // 2. Parse and validate body.
  //  - parent_generation_id (string, required): the image being edited
  //  - edit_instruction     (string, required): plain natural language, one change
  let parentGenerationId: string
  let editInstruction: string
  try {
    const body = (await request.json()) as {
      parent_generation_id?: unknown
      edit_instruction?: unknown
    }
    if (
      typeof body.parent_generation_id !== 'string' ||
      typeof body.edit_instruction !== 'string'
    ) {
      return NextResponse.json(
        { error: 'Invalid request body.' },
        { status: 400 }
      )
    }
    parentGenerationId = body.parent_generation_id
    editInstruction = body.edit_instruction.trim()
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body.' },
      { status: 400 }
    )
  }

  if (editInstruction.length === 0) {
    return NextResponse.json(
      { error: 'Tell us what to change.' },
      { status: 400 }
    )
  }

  if (editInstruction.length > 500) {
    return NextResponse.json(
      { error: 'Instruction is too long. Try one change at a time.' },
      { status: 400 }
    )
  }

  // 3. Look up the parent generation.
  // Not a best-effort SELECT: a failed query must surface as an error,
  // never as a silent "not found" (learning #73).
  const { data: parentRow, error: parentLookupError } = await supabase
    .from('generations')
    .select('id, image_url')
    .eq('id', parentGenerationId)
    .maybeSingle()

  if (parentLookupError) {
    console.error('Parent generation lookup failed:', parentLookupError)
    return NextResponse.json(
      { error: 'Failed to load the source image. Please try again.' },
      { status: 500 }
    )
  }

  if (!parentRow) {
    return NextResponse.json(
      {
        error:
          'The image you are editing is no longer available. Please refresh and try again.',
      },
      { status: 400 }
    )
  }

  const sourceImageUrl = parentRow.image_url

  // 4. Replicate token check
  const replicateToken = process.env.REPLICATE_API_TOKEN
  if (!replicateToken) {
    console.error('REPLICATE_API_TOKEN is not configured.')
    return NextResponse.json(
      { error: 'Server is not configured for image editing.' },
      { status: 500 }
    )
  }

  // Compose the render prompt: user instruction first, identity lock second.
  // The clean instruction is stored separately in generations.edit_instruction
  // so the chat UI can display exactly what the user typed.
  const normalizedInstruction = /[.!?]$/.test(editInstruction)
    ? editInstruction
    : `${editInstruction}.`
  const renderPrompt = `${normalizedInstruction} ${IDENTITY_LOCK}`

  // 5. Call Replicate (flux-kontext-pro) in sync mode via the `Prefer: wait` header.
  try {
    const replicateResponse = await fetch(
      'https://api.replicate.com/v1/models/black-forest-labs/flux-kontext-pro/predictions',
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
            input_image: sourceImageUrl,
            aspect_ratio: 'match_input_image',
            // Upsampling rewrites the prompt and dilutes the identity lock.
            prompt_upsampling: false,
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
        { error: 'Image editing failed.' },
        { status: 502 }
      )
    }

    const prediction = (await replicateResponse.json()) as ReplicatePrediction

    // Normalize output shape defensively (string vs string[]).
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
      // 6. Download immediately — Replicate URLs expire.
      const imageResponse = await fetch(replicateImageUrl)
      if (!imageResponse.ok) {
        console.error(
          'Failed to download image from Replicate:',
          imageResponse.status
        )
        return NextResponse.json(
          { error: 'Failed to save the edited image. Please try again.' },
          { status: 502 }
        )
      }

      // Derive extension from the actual response rather than assuming a format.
      const rawContentType = imageResponse.headers.get('content-type') ?? ''
      let fileExtension: string
      let storageContentType: string
      if (rawContentType.includes('png')) {
        fileExtension = 'png'
        storageContentType = 'image/png'
      } else if (rawContentType.includes('webp')) {
        fileExtension = 'webp'
        storageContentType = 'image/webp'
      } else if (
        rawContentType.includes('jpeg') ||
        rawContentType.includes('jpg')
      ) {
        fileExtension = 'jpg'
        storageContentType = 'image/jpeg'
      } else {
        console.error('Unexpected image content-type:', rawContentType)
        return NextResponse.json(
          { error: 'Failed to save the edited image. Please try again.' },
          { status: 502 }
        )
      }

      const imageArrayBuffer = await imageResponse.arrayBuffer()

      // 7. Upload to Supabase Storage at <user_id>/<prediction_id>.<ext>
      const filePath = `${user.id}/${prediction.id}.${fileExtension}`
      const { error: uploadError } = await supabase.storage
        .from('generations')
        .upload(filePath, imageArrayBuffer, {
          contentType: storageContentType,
          upsert: false,
        })

      if (uploadError) {
        console.error('Failed to upload image to Storage:', uploadError)
        return NextResponse.json(
          { error: 'Failed to save the edited image. Please try again.' },
          { status: 502 }
        )
      }

      // 8. Permanent public URL
      const { data: publicUrlData } = supabase.storage
        .from('generations')
        .getPublicUrl(filePath)
      const permanentImageUrl = publicUrlData.publicUrl

      // 9. Atomic INSERT via RPC — generation + creative_contribution in one transaction.
      // character_id is inherited from the parent inside the RPC, not sent by the client.
      const { data: newGenerationId, error: rpcError } = await supabase.rpc(
        'create_edit_with_contribution',
        {
          p_parent_generation_id: parentGenerationId,
          p_edit_instruction: editInstruction,
          p_prompt_effective: renderPrompt,
          p_image_url: permanentImageUrl,
          p_prediction_id: prediction.id,
          p_model: MODEL_NAME,
        }
      )

      if (rpcError) {
        console.error('Failed to save edit + contribution:', rpcError)
        return NextResponse.json(
          { error: 'Failed to save your edit. Please try again.' },
          { status: 502 }
        )
      }

      return NextResponse.json({
        generationId: newGenerationId,
        imageUrl: permanentImageUrl,
        predictionId: prediction.id,
        parentGenerationId,
        editInstruction,
      })
    }

    if (prediction.status === 'failed' || prediction.status === 'canceled') {
      console.error('Prediction failed:', prediction.error)
      return NextResponse.json(
        { error: 'Image editing failed.' },
        { status: 502 }
      )
    }

    // Still processing after the `Prefer: wait` timeout
    return NextResponse.json(
      {
        error: 'Editing is taking too long. Please try again.',
        predictionId: prediction.id,
      },
      { status: 504 }
    )
  } catch (error) {
    console.error('Unexpected error during image editing:', error)
    return NextResponse.json(
      { error: 'Unexpected server error.' },
      { status: 500 }
    )
  }
}
