// src/app/characters/actions.ts
'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type TraitInput = { label: string; value: string }

type CreateCharacterInput = {
  name: string
  description: string | null
  distinctive_traits: TraitInput[]
}

type UpdateCharacterInput = CreateCharacterInput

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string }

export async function createCharacter(
  input: CreateCharacterInput,
): Promise<{ error: string } | void> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in.' }
  }

  const name = input.name.trim()
  if (!name) return { error: 'Name is required.' }
  if (name.length > 80) return { error: 'Name must be 80 characters or less.' }

  const description = input.description?.trim() || null
  if (description && description.length > 500) {
    return { error: 'Description must be 500 characters or less.' }
  }

  const traits: TraitInput[] = Array.isArray(input.distinctive_traits)
    ? input.distinctive_traits
        .map((t) => ({
          label: typeof t?.label === 'string' ? t.label.trim() : '',
          value: typeof t?.value === 'string' ? t.value.trim() : '',
        }))
        .filter((t) => t.label && t.value)
    : []

  const { error } = await supabase.from('characters').insert({
    user_id: user.id,
    name,
    description,
    distinctive_traits: traits,
  })

  if (error) {
    console.error('Failed to create character:', error)
    return { error: 'Could not create character. Please try again.' }
  }

  redirect('/characters')
}

export async function updateCharacter(
  characterId: string,
  input: UpdateCharacterInput,
): Promise<ActionResult> {
  if (typeof characterId !== 'string' || !characterId) {
    return { ok: false, error: 'Invalid character.' }
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, error: 'You must be signed in.' }
  }

  const name = input.name.trim()
  if (!name) return { ok: false, error: 'Name is required.' }
  if (name.length > 80) {
    return { ok: false, error: 'Name must be 80 characters or less.' }
  }

  const description = input.description?.trim() || null
  if (description && description.length > 500) {
    return { ok: false, error: 'Description must be 500 characters or less.' }
  }

  const traits: TraitInput[] = Array.isArray(input.distinctive_traits)
    ? input.distinctive_traits
        .map((t) => ({
          label: typeof t?.label === 'string' ? t.label.trim() : '',
          value: typeof t?.value === 'string' ? t.value.trim() : '',
        }))
        .filter((t) => t.label && t.value)
    : []

  const { error } = await supabase
    .from('characters')
    .update({
      name,
      description,
      distinctive_traits: traits,
    })
    .eq('id', characterId)
    .eq('user_id', user.id)

  if (error) {
    console.error('Failed to update character:', error)
    return { ok: false, error: 'Could not save changes. Please try again.' }
  }

  revalidatePath(`/characters/${characterId}`)
  revalidatePath('/characters')
  return { ok: true }
}
