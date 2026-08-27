'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type RefineBoxProps = {
  parentGenerationId: string
}

/**
 * Phase 2.7-A — minimal refinement box (validation build).
 * Purpose: confirm flux-kontext-pro works end-to-end through our own pipeline.
 * The real UI (chat + lineage tree) comes in 2.7-B.
 */
export default function RefineBox({ parentGenerationId }: RefineBoxProps) {
  const router = useRouter()
  const [instruction, setInstruction] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [resultUrl, setResultUrl] = useState<string | null>(null)

  async function handleSubmit() {
    const trimmed = instruction.trim()
    if (trimmed.length === 0 || isSubmitting) return

    setIsSubmitting(true)
    setErrorMessage(null)
    setResultUrl(null)

    try {
      const response = await fetch('/api/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parent_generation_id: parentGenerationId,
          edit_instruction: trimmed,
        }),
      })

      const data = (await response.json()) as {
        imageUrl?: string
        error?: string
      }

      if (!response.ok) {
        setErrorMessage(data.error ?? 'Something went wrong. Please try again.')
        return
      }

      if (!data.imageUrl) {
        setErrorMessage('No image was returned. Please try again.')
        return
      }

      setResultUrl(data.imageUrl)
      setInstruction('')
      // Refresh the server component so the new work appears in the grid.
      router.refresh()
    } catch {
      setErrorMessage('Network error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      style={{
        backgroundColor: '#141318',
        border: '1px solid #2a2620',
        borderRadius: '12px',
        padding: '20px',
        marginTop: '16px',
      }}
    >
      <p
        style={{
          color: '#F59E0B',
          fontSize: '11px',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          marginBottom: '12px',
        }}
      >
        Refine this work
      </p>

      <textarea
        value={instruction}
        onChange={(event) => setInstruction(event.target.value)}
        placeholder="Change the outfit to a long charcoal wool coat"
        rows={3}
        disabled={isSubmitting}
        style={{
          width: '100%',
          backgroundColor: '#0a0a0c',
          border: '1px solid #2a2620',
          borderRadius: '8px',
          color: '#e8e4da',
          padding: '12px',
          fontSize: '14px',
          resize: 'vertical',
        }}
      />

      <p style={{ color: '#8a8578', fontSize: '12px', marginTop: '8px' }}>
        One change at a time. Face, hair, and body stay the same.
      </p>

      <button
        onClick={handleSubmit}
        disabled={isSubmitting || instruction.trim().length === 0}
        style={{
          marginTop: '12px',
          backgroundColor:
            isSubmitting || instruction.trim().length === 0
              ? '#3a3630'
              : '#F59E0B',
          color:
            isSubmitting || instruction.trim().length === 0
              ? '#8a8578'
              : '#0a0a0c',
          border: 'none',
          borderRadius: '8px',
          padding: '10px 20px',
          fontSize: '14px',
          fontWeight: 600,
          cursor:
            isSubmitting || instruction.trim().length === 0
              ? 'not-allowed'
              : 'pointer',
        }}
      >
        {isSubmitting ? 'Refining…' : 'Refine'}
      </button>

      {errorMessage && (
        <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '12px' }}>
          {errorMessage}
        </p>
      )}

      {resultUrl && (
        <div style={{ marginTop: '16px' }}>
          <p
            style={{
              color: '#F59E0B',
              fontSize: '11px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}
          >
            Result
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resultUrl}
            alt="Refined result"
            style={{
              width: '100%',
              maxWidth: '320px',
              borderRadius: '8px',
              border: '1px solid #2a2620',
            }}
          />
        </div>
      )}
    </div>
  )
}
