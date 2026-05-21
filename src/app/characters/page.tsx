// src/app/characters/page.tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'My Characters — Ownoid',
  description: 'Your distinctive humanoid characters.',
}

type CharacterRow = {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
  generations: Array<{ image_url: string | null; created_at: string }>
}

export default async function CharactersPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/characters')
  }

  // CP-6-e: nested select — all generations per character (for thumbnail + count)
  const { data, error } = await supabase
    .from('characters')
    .select(
      `
      id,
      name,
      description,
      created_at,
      updated_at,
      generations (
        image_url,
        created_at
      )
    `,
    )
    .order('updated_at', { ascending: false })
    .order('created_at', { foreignTable: 'generations', ascending: false })

  if (error) {
    console.error('Failed to load characters:', error)
  }

  const characters: CharacterRow[] = (data ?? []) as CharacterRow[]
  const hasCharacters = characters.length > 0

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">My Characters</h1>
          {hasCharacters && (
            <Link
              href="/characters/new"
              className="px-4 py-2 rounded-lg bg-white text-black font-medium hover:bg-gray-200 transition"
            >
              + New Character
            </Link>
          )}
        </div>

        {hasCharacters ? (
          <CharacterGrid characters={characters} />
        ) : (
          <EmptyState />
        )}
      </div>
    </main>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24 px-6 border border-gray-800 rounded-2xl">
      <h2 className="text-2xl font-semibold mb-3">
        Design your distinctive humanoid.
      </h2>
      <p className="text-gray-400 italic mb-8 max-w-md">
        Refine it, register it — make it yours, on the record.
      </p>
      <Link
        href="/characters/new"
        className="px-6 py-3 rounded-lg bg-white text-black font-medium hover:bg-gray-200 transition"
      >
        + Create Your First Character
      </Link>
    </div>
  )
}

function CharacterGrid({ characters }: { characters: CharacterRow[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {characters.map((c) => (
        <CharacterCard key={c.id} character={c} />
      ))}
    </div>
  )
}

function CharacterCard({ character }: { character: CharacterRow }) {
  const initial = character.name.trim().charAt(0).toUpperCase() || '?'
  const generations = character.generations
  const thumbnailUrl = generations[0]?.image_url ?? null
  const worksCount = generations.length

  return (
    <Link
      href={`/characters/${character.id}`}
      className="block bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-600 hover:-translate-y-0.5 transition"
    >
      <div className="relative aspect-square bg-gradient-to-br from-gray-800 to-gray-950 flex items-center justify-center overflow-hidden">
        {thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl}
            alt={character.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-5xl font-bold text-gray-700">{initial}</span>
        )}
        {worksCount > 0 && (
          <span className="absolute top-2 right-2 px-2 py-1 rounded-md bg-black/70 backdrop-blur-sm text-xs font-medium text-white border border-white/10">
            {worksCount} {worksCount === 1 ? 'work' : 'works'}
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-1 truncate">
          {character.name}
        </h3>
        {character.description && (
          <p className="text-sm text-gray-400 line-clamp-2">
            {character.description}
          </p>
        )}
      </div>
    </Link>
  )
}
