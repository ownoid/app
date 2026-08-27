'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export type RefineSource = {
  id: string
  label: string
  isBase: boolean
}

type RefineBoxProps = {
  sources: RefineSource[]
}

/**
 * Phase 2.7-A — minimal refinement box (validation build).
 * Now with explicit source selection: the parent image matters as much as
 * the instruction, because editing a "covering" work (e.g. a long coat)
 * forces the model to invent body information it can no longer see.
 * The real UI (chat + lineage tree) comes in 2.7-B.
 */
export default function RefineBox({ sources }: RefineBoxProps) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState<string>(
    sources.length > 0 ? sources[0].id : ''
  )
  const [instruction, setInstruction] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [resultUrl, setResultUrl] = useState<string | null>(null)

  const selectedSource = sources.find((s) => s.id === selectedId) ?? null
  const canSubmit =
    !isSubmitting && instruction.trim().length > 0 && selectedId.length > 0

  async function handleSubmit() {
    if (!canSubmit) return

    setIsSubmitting(true)
    setErrorMessage(null)
    setResultUrl(null)

    try {
      const response = await fetch('/api/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parent_generation_id: selectedId,
          edit_instruction: instruction.trim(),
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
      router.refresh()
    } catch {
      setErrorMessage('Network error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const labelStyle = {
    color: '#F59E0B',
    fontSize: '11px',
    letterSpacing: '0.2em',
    textTransform: 'uppercase' as const,
    marginBottom: '8px',
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
      <p style={{ ...labelStyle, marginBottom: '12px' }}>Refine a work</p>

      <label
        htmlFor="refine-source"
        style={{
          display: 'block',
          color: '#8a8578',
          fontSize: '12px',
          marginBottom: '6px',
        }}
      >
        Start from
      </label>
      <select
        id="refine-source"
        value={selectedId}
        onChange={(event) => setSelectedId(event.target.value)}
        disabled={isSubmitting}
        style={{
          width: '100%',
          backgroundColor: '#0a0a0c',
          border: '1px solid #2a2620',
          borderRadius: '8px',
          color: '#e8e4da',
          padding: '10px 12px',
          fontSize: '14px',
          marginBottom: '14px',
        }}
      >
        {sources.map((source) => (
          <option key={source.id} value={source.id}>
            {source.label}
          </option>
        ))}
      </select>

      {selectedSource && !selectedSource.isBase && (
        <p
          style={{
            color: '#8a8578',
            fontSize: '12px',
            marginTop: '-6px',
            marginBottom: '14px',
            lineHeight: 1.5,
          }}
        >
          Heads up: if this work hides part of the body, an outfit change has to
          reinvent what it cannot see. Start from a base for outfit changes.
        </p>
      )}

      <textarea
        value={instruction}
        onChange={(event) => setInstruction(event.target.value)}
        placeholder="Change the outfit to a fitted athletic set"
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
        disabled={!canSubmit}
        style={{
          marginTop: '12px',
          backgroundColor: canSubmit ? '#F59E0B' : '#3a3630',
          color: canSubmit ? '#0a0a0c' : '#8a8578',
          border: 'none',
          borderRadius: '8px',
          padding: '10px 20px',
          fontSize: '14px',
          fontWeight: 600,
          cursor: canSubmit ? 'pointer' : 'not-allowed',
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
          <p style={labelStyle}>Result</p>
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
