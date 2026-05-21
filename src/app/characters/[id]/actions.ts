// src/app/characters/[id]/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const MAX_COLORS = 7
const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string }

export async function updateSignaturePalette(
  characterId: string,
  palette: string[]
): Promise<ActionResult> {
  // 1) Validate input shape (learning #36: strict invalid input handling)
  if (!Array.isArray(palette)) {
    return { ok: false, error: 'Invalid palette format.' }
  }
  if (palette.length > MAX_COLORS) {
    return { ok: false, error: `Maximum ${MAX_COLORS} colors allowed.` }
  }
  for (const c of palette) {
    if (typeof c !== 'string' || !HEX_PATTERN.test(c)) {
      return { ok: false, error: 'Each color must be a valid hex code.' }
    }
  }

  // 2) Auth
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, error: 'Not authenticated.' }
  }

  // 3) Update (RLS auto-filters; explicit user_id = defense in depth)
  const { error } = await supabase
    .from('characters')
    .update({ signature_palette: palette })
    .eq('id', characterId)
    .eq('user_id', user.id)

  if (error) {
    console.error('Failed to update signature palette:', error)
    return { ok: false, error: 'Failed to save. Please try again.' }
  }

  revalidatePath(`/characters/${characterId}`)
  return { ok: true }
}
