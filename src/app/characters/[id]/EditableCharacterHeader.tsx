'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import CharacterForm, { type Trait } from '../CharacterForm'
type Props = {
  characterId: string
  name: string
  description: string | null
  traits: Trait[]
}
export default function EditableCharacterHeader({
  characterId,
  name,
  description,
  traits,
}: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const router = useRouter()
  function handleSaved() {
    setIsEditing(false)
    router.refresh()
  }
  function handleCancel() {
    setIsEditing(false)
  }
  if (isEditing) {
    return (
      <div className="mb-10">
        <CharacterForm
          mode="edit"
          characterId={characterId}
          initialName={name}
          initialDescription={description}
          initialTraits={traits}
          onCancel={handleCancel}
          onSaved={handleSaved}
        />
      </div>
    )
  }
  return (
    <div className="mb-10">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1
            className="text-5xl mb-3"
            style={{
              fontFamily: 'var(--font-fraunces), serif',
              fontWeight: 500,
              letterSpacing: '-0.01em',
            }}
          >
            {name}
          </h1>
          {description && (
            <p className="text-gray-300 text-lg leading-relaxed">
              {description}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="shrink-0 px-4 py-2 rounded-lg border border-gray-800 text-gray-400 hover:border-gray-600 hover:text-white transition text-sm"
        >
          Edit
        </button>
      </header>
      {traits.length > 0 && (
        <section>
          <h2
            className="text-xs font-semibold uppercase tracking-[0.2em] mb-3"
            style={{ color: '#F59E0B' }}
          >
            Distinctive traits
          </h2>
          <dl className="space-y-2">
            {traits.map((t, i) => (
              <div
                key={i}
                className="flex gap-4 px-4 py-3 rounded-lg"
                style={{
                  backgroundColor: '#141318',
                  border: '1px solid #2a2620',
                }}
              >
                <dt className="min-w-[140px] font-medium text-gray-400">
                  {t.label}
                </dt>
                <dd className="text-white">{t.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  )
}
