// src/app/characters/CharacterForm.tsx
'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { createCharacter } from './actions'

export type Trait = { label: string; value: string }

type CreateProps = { mode: 'create' }

type EditProps = {
  mode: 'edit'
  characterId: string
  initialName: string
  initialDescription: string | null
  initialTraits: Trait[]
  onCancel?: () => void
  onSaved?: () => void
}

export type CharacterFormProps = CreateProps | EditProps

export default function CharacterForm(props: CharacterFormProps) {
  const isEdit = props.mode === 'edit'

  const [name, setName] = useState(isEdit ? props.initialName : '')
  const [description, setDescription] = useState(
    isEdit ? props.initialDescription ?? '' : ''
  )
  const [traits, setTraits] = useState<Trait[]>(
    isEdit ? props.initialTraits : []
  )
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function addTrait() {
    setTraits([...traits, { label: '', value: '' }])
  }

  function removeTrait(idx: number) {
    setTraits(traits.filter((_, i) => i !== idx))
  }

  function updateTrait(idx: number, field: 'label' | 'value', val: string) {
    setTraits(traits.map((t, i) => (i === idx ? { ...t, [field]: val } : t)))
  }

  function handleCancel() {
    if (props.mode === 'edit') {
      props.onCancel?.()
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Name is required.')
      return
    }
    if (trimmedName.length > 80) {
      setError('Name must be 80 characters or less.')
      return
    }

    const cleanTraits = traits
      .map((t) => ({ label: t.label.trim(), value: t.value.trim() }))
      .filter((t) => t.label && t.value)

    startTransition(async () => {
      if (props.mode === 'create') {
        const result = await createCharacter({
          name: trimmedName,
          description: description.trim() || null,
          distinctive_traits: cleanTraits,
        })
        if (result?.error) {
          setError(result.error)
        }
      } else {
        // CP-6-d-2: updateCharacter 호출 자리
        setError('Edit mode is not yet implemented.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium mb-2">Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Nyra-7"
          maxLength={80}
          required
          className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg focus:border-gray-600 focus:outline-none"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Description
          <span className="text-gray-500 font-normal ml-2">(optional)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="A short description of who they are."
          rows={3}
          maxLength={500}
          className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg focus:border-gray-600 focus:outline-none resize-none"
        />
      </div>

      {/* Distinctive traits */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Distinctive traits
          <span className="text-gray-500 font-normal ml-2">
            (optional but recommended)
          </span>
        </label>
        <p className="text-sm text-gray-500 mb-3">
          What makes this character recognizable across many works? Define traits
          in your own words.
        </p>

        {traits.length > 0 && (
          <div className="space-y-2 mb-3">
            {traits.map((trait, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  type="text"
                  value={trait.label}
                  onChange={(e) => updateTrait(idx, 'label', e.target.value)}
                  placeholder="e.g., Build"
                  className="w-1/3 px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg focus:border-gray-600 focus:outline-none text-sm"
                />
                <input
                  type="text"
                  value={trait.value}
                  onChange={(e) => updateTrait(idx, 'value', e.target.value)}
                  placeholder="e.g., athletic, slender"
                  className="flex-1 px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg focus:border-gray-600 focus:outline-none text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeTrait(idx)}
                  className="px-3 text-gray-500 hover:text-white transition"
                  aria-label="Remove trait"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={addTrait}
          className="px-4 py-2 border border-gray-800 rounded-lg text-sm text-gray-400 hover:border-gray-600 hover:text-white transition"
        >
          + Add a distinctive trait
        </button>
      </div>

      {/* Error */}
      {error && <div className="text-red-400 text-sm">{error}</div>}

      {/* Submit + Cancel */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-3 rounded-lg bg-white text-black font-medium hover:bg-gray-200 disabled:opacity-50 transition"
        >
          {isPending
            ? isEdit
              ? 'Saving...'
              : 'Creating...'
            : isEdit
              ? 'Save changes'
              : 'Create Character'}
        </button>
        {isEdit ? (
          <button
            type="button"
            onClick={handleCancel}
            className="px-6 py-3 rounded-lg border border-gray-800 text-gray-400 hover:border-gray-600 hover:text-white transition"
          >
            Cancel
          </button>
        ) : (
          <Link
            href="/characters"
            className="px-6 py-3 rounded-lg border border-gray-800 text-gray-400 hover:border-gray-600 hover:text-white transition"
          >
            Cancel
          </Link>
        )}
      </div>
    </form>
  )
}
