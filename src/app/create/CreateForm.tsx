'use client'

import { useState } from 'react'
import Link from 'next/link'

export type Character = {
  id: string
  name: string
  distinctive_traits: Array<{ label: string; value: string }>
}

type Props = {
  characters: Character[]
}

function buildPrompt(
  userPrompt: string,
  traits: Array<{ label: string; value: string }>,
): string {
  if (traits.length === 0) return userPrompt
  const traitStr = traits.map((t) => `${t.label}: ${t.value}`).join(', ')
  return `${traitStr}. ${userPrompt}`
}

export default function CreateForm({ characters }: Props) {
  const [prompt, setPrompt] = useState('')
  const [characterId, setCharacterId] = useState<string | null>(null)
  const [includeTraits, setIncludeTraits] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const selectedChar = characterId
    ? characters.find((c) => c.id === characterId) ?? null
    : null
  const hasTraits = (selectedChar?.distinctive_traits.length ?? 0) > 0
  const willPrepend = includeTraits && hasTraits
  const effectivePrompt =
    willPrepend && selectedChar
      ? buildPrompt(prompt, selectedChar.distinctive_traits)
      : prompt

  async function handleGenerate() {
    setIsLoading(true)
    setError(null)
    setImageUrl(null)

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: effectivePrompt }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        return
      }

      setImageUrl(data.imageUrl)
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Character selection */}
      <div className="flex flex-col gap-2">
        <label htmlFor="character" className="text-sm text-gray-400">
          Character
        </label>
        {characters.length === 0 ? (
          <Link
            href="/characters/new?next=/create"
            className="text-sm text-gray-500 hover:text-gray-300 transition"
          >
            No characters yet. Create one for consistent variations →
          </Link>
        ) : (
          <select
            id="character"
            value={characterId ?? ''}
            onChange={(e) => setCharacterId(e.target.value || null)}
            disabled={isLoading}
            className="rounded-lg bg-gray-900 border border-gray-700 p-3 text-white focus:outline-none focus:border-gray-500 disabled:opacity-50"
          >
            <option value="">No character (default)</option>
            {characters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Traits toggle — only shows when a character WITH traits is selected */}
      {selectedChar && hasTraits && (
        <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={includeTraits}
            onChange={(e) => setIncludeTraits(e.target.checked)}
            disabled={isLoading}
            className="rounded border-gray-700 bg-gray-900"
          />
          Include character traits in prompt
        </label>
      )}

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="e.g., A sleek humanoid robot with chrome plating and blue accents"
        rows={4}
        disabled={isLoading}
        className="w-full rounded-lg bg-gray-900 border border-gray-700 p-4 text-white placeholder-gray-500 focus:outline-none focus:border-gray-500 resize-none disabled:opacity-50"
      />

      {/* Prompt preview — only when traits will actually be prepended */}
      {willPrepend && prompt.trim() && (
        <div className="rounded-lg border border-gray-800 bg-gray-950 p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">
            Final prompt sent to AI
          </div>
          <div className="text-sm text-gray-300 whitespace-pre-wrap break-words">
            {effectivePrompt}
          </div>
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={!prompt.trim() || isLoading}
        className="rounded-lg bg-white text-black px-6 py-3 font-semibold hover:bg-gray-200 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition"
      >
        {isLoading ? 'Generating...' : 'Generate'}
      </button>

      {error && (
        <div className="rounded-lg bg-red-950 border border-red-800 p-4 text-red-200">
          {error}
        </div>
      )}

      {isLoading && (
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-12 text-center text-gray-400">
          Generating your humanoid... (about 3 seconds)
        </div>
      )}

      {imageUrl && !isLoading && (
        <div className="flex flex-col gap-4">
          <img
            src={imageUrl}
            alt="Generated humanoid"
            className="w-full rounded-lg border border-gray-800"
          />
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isLoading}
            className="rounded-lg border border-gray-700 bg-transparent text-white px-6 py-3 font-semibold hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Generate again
          </button>
        </div>
      )}
    </div>
  )
}
