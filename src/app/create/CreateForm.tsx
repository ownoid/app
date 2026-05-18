'use client'

import { useState } from 'react'

export default function CreateForm() {
  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate() {
    setIsLoading(true)
    setError(null)
    setImageUrl(null)

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
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
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="e.g., A sleek humanoid robot with chrome plating and blue accents"
        rows={4}
        disabled={isLoading}
        className="w-full rounded-lg bg-gray-900 border border-gray-700 p-4 text-white placeholder-gray-500 focus:outline-none focus:border-gray-500 resize-none disabled:opacity-50"
      />
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
        <div>
          <img
            src={imageUrl}
            alt="Generated humanoid"
            className="w-full rounded-lg border border-gray-800"
          />
        </div>
      )}
    </div>
  )
}
