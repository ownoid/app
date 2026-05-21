// src/app/characters/[id]/CreationLog.tsx
// Server component — pure read-only timeline of human creative contributions.
// CP-7-d: makes "On the record" visible to beta users.

export type CreationLogEntry = {
  id: string
  prompt_raw: string
  traits_included: boolean
  created_at: string
  image_url: string | null
}

type Props = {
  entries: CreationLogEntry[]
}

function formatRelativeTime(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 7) return `${diffDay}d ago`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function CreationLog({ entries }: Props) {
  // Hide the entire section if there are no entries (e.g., character has
  // only pre-CP-7-c generations, or no generations at all).
  if (entries.length === 0) return null

  return (
    <section className="mb-10">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
        Creation log
      </h2>
      <p className="text-sm text-gray-500 italic mb-4">
        Every variation, on the record.
      </p>
      <ul className="flex flex-col gap-3">
        {entries.map((entry) => (
          <li
            key={entry.id}
            className="flex items-start gap-4 p-4 bg-gray-900 border border-gray-800 rounded-xl"
          >
            <div className="shrink-0 w-16 h-16 bg-gray-950 rounded-lg overflow-hidden">
              {entry.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={entry.image_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-200 break-words whitespace-pre-wrap">
                {entry.prompt_raw}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {entry.traits_included ? 'With traits' : 'Without traits'}
                {' · '}
                {formatRelativeTime(entry.created_at)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
