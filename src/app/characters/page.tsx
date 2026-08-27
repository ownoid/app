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
    <main
      className="min-h-screen text-white"
      style={{ backgroundColor: '#0a0a0c' }}
    >
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">My Characters</h1>
          {hasCharacters && (
            <Link
              href="/characters/new"
              className="px-4 py-2 rounded-lg font-medium transition hover:opacity-90"
              style={{ backgroundColor: '#F59E0B', color: '#0a0a0c' }}
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
    <div
      className="flex flex-col items-center justify-center text-center py-24 px-6 rounded-2xl"
      style={{ border: '1px solid #2a2620' }}
    >
      <h2 className="text-2xl font-semibold mb-3">
        Design your distinctive humanoid.
      </h2>
      <p className="italic mb-8 max-w-md" style={{ color: '#8a8578' }}>
        Refine it, register it — make it yours, on the record.
      </p>
      <Link
        href="/characters/new"
        className="px-6 py-3 rounded-lg font-medium transition hover:opacity-90"
        style={{ backgroundColor: '#F59E0B', color: '#0a0a0c' }}
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
      className="block rounded-2xl overflow-hidden transition hover:-translate-y-0.5"
      style={{ backgroundColor: '#141318', border: '1px solid #2a2620' }}
    >
      {/* 2:3 to match the generated full-body format — a square frame crops
          heads and feet (learning #79). */}
      <div
        className="relative aspect-[2/3] flex items-center justify-center overflow-hidden"
        style={{ backgroundColor: '#0a0a0c' }}
      >
        {thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl}
            alt={character.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-5xl font-bold" style={{ color: '#3a3630' }}>
            {initial}
          </span>
        )}
        {worksCount > 0 && (
          <span
            className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{
              backgroundColor: 'rgba(10,10,12,0.75)',
              color: '#e8e4da',
              border: '1px solid #3a352a',
            }}
          >
            {worksCount} {worksCount === 1 ? 'work' : 'works'}
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-1 truncate">
          {character.name}
        </h3>
        {character.description && (
          <p className="text-sm line-clamp-2" style={{ color: '#8a8578' }}>
            {character.description}
          </p>
        )}
      </div>
    </Link>
  )
}
