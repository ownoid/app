// src/app/characters/[id]/SignaturePaletteEditor.tsx
'use client'

import { useState, useTransition } from 'react'
import { updateSignaturePalette } from './actions'

const MAX_COLORS = 7
const DEFAULT_NEW_COLOR = '#FFFFFF'

type Props = {
  characterId: string
  initialPalette: string[]
}

export default function SignaturePaletteEditor({
  characterId,
  initialPalette,
}: Props) {
  const [palette, setPalette] = useState<string[]>(initialPalette)
  const [savedPalette, setSavedPalette] = useState<string[]>(initialPalette)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isDirty =
    palette.length !== savedPalette.length ||
    palette.some((c, i) => c !== savedPalette[i])

  function addColor() {
    if (palette.length >= MAX_COLORS) return
    setPalette([...palette, DEFAULT_NEW_COLOR])
    setError(null)
  }

  function updateColor(index: number, value: string) {
    const next = [...palette]
    next[index] = value.toUpperCase()
    setPalette(next)
    setError(null)
  }

  function removeColor(index: number) {
    setPalette(palette.filter((_, i) => i !== index))
    setError(null)
  }

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const result = await updateSignaturePalette(characterId, palette)
      if (result.ok) {
        setSavedPalette(palette)
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <section className="mb-10">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
        Signature palette
      </h2>

      <div className="flex flex-wrap items-center gap-2 p-4 rounded-lg bg-gray-900 border border-gray-800">
        {palette.length === 0 && (
          <p className="text-sm text-gray-500 italic">
            No colors yet. Add the hues that define this character.
          </p>
        )}

        {palette.map((color, i) => (
          <div
            key={i}
            className="flex items-center gap-1.5 bg-gray-950 rounded-lg px-2 py-1.5 border border-gray-800"
          >
            <label className="relative w-7 h-7 rounded-full overflow-hidden border-2 border-gray-700 cursor-pointer block">
              <div
                className="absolute inset-0"
                style={{ backgroundColor: color }}
              />
              <input
                type="color"
                value={color}
                onChange={(e) => updateColor(i, e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                aria-label={`Color ${i + 1}`}
              />
            </label>
            <span className="text-xs font-mono text-gray-400">{color}</span>
            <button
              type="button"
              onClick={() => removeColor(i)}
              className="text-gray-600 hover:text-red-400 transition text-lg leading-none ml-1"
              aria-label={`Remove color ${i + 1}`}
            >
              ×
            </button>
          </div>
        ))}

        {palette.length < MAX_COLORS && (
          <button
            type="button"
            onClick={addColor}
            className="px-3 py-2 rounded-lg border border-dashed border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition text-sm"
          >
            + Add color
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 mt-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={!isDirty || isPending}
          className="px-4 py-2 rounded-lg bg-white text-black font-medium hover:bg-gray-200 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isPending ? 'Saving...' : 'Save palette'}
        </button>
        {!isDirty && savedPalette.length > 0 && !error && (
          <span className="text-xs text-gray-500">Saved</span>
        )}
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>

      <p className="text-xs text-gray-600 mt-2">
        Up to {MAX_COLORS} colors. These define your character&apos;s visual
        identity.
      </p>
    </section>
  )
}
