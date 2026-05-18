'use client'

import { useState } from 'react'

export default function CreateForm() {
  const [prompt, setPrompt] = useState('')

  function handleGenerate() {
    console.log('Prompt:', prompt)
  }

  return (
    <div className="flex flex-col gap-4">
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="e.g., A sleek humanoid robot with chrome plating and blue accents"
        rows={4}
        className="w-full rounded-lg bg-gray-900 border border-gray-700 p-4 text-white placeholder-gray-500 focus:outline-none focus:border-gray-500 resize-none"
      />
      <button
        onClick={handleGenerate}
        disabled={!prompt.trim()}
        className="rounded-lg bg-white text-black px-6 py-3 font-semibold hover:bg-gray-200 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition"
      >
        Generate
      </button>
    </div>
  )
}
