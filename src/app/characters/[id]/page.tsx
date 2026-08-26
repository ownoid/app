import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import SignaturePaletteEditor from './SignaturePaletteEditor'
import EditableCharacterHeader from './EditableCharacterHeader'
import CreationLog, { CreationLogEntry } from './CreationLog'

export const metadata = {
  title: 'Character — Ownoid',
  description: 'Character detail.',
}

type TraitRow = { label: string; value: string }

type Generation = {
  id: string
  image_url: string | null
  prompt: string | null
  created_at: string
}

type RawContribution = {
  id: string
  prompt_raw: string
  traits_included: boolean
  created_at: string
  generations:
    | { image_url: string | null }
    | { image_url: string | null }[]
    | null
}

export default async function CharacterDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = params
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=/characters/${id}`)
  }

  const { data: character, error: charError } = await supabase
    .from('characters')
    .select(
      'id, name, description, distinctive_traits, signature_palette, created_at, updated_at'
    )
    .eq('id', id)
    .maybeSingle()

  if (charError) {
    console.error('Failed to load character:', charError)
    notFound()
  }
  if (!character) {
    notFound()
  }

  const rawTraits = character.distinctive_traits
  const traits: TraitRow[] = Array.isArray(rawTraits)
    ? (rawTraits as TraitRow[])
    : []

  const rawPalette = character.signature_palette
  const palette: string[] = Array.isArray(rawPalette)
    ? (rawPalette as string[])
    : []

  const { data: genData, error: genError } = await supabase
    .from('generations')
    .select('id, image_url, prompt, created_at')
    .eq('character_id', id)
    .order('created_at', { ascending: false })

  if (genError) {
    console.error('Failed to load generations:', genError)
  }

  const works: Generation[] = (genData ?? []) as Generation[]
  const workCount = works.length

  const { data: contribData, error: contribError } = await supabase
    .from('creative_contributions')
    .select(
      `
      id,
      prompt_raw,
      traits_included,
      created_at,
      generations (
        image_url
      )
    `
    )
    .eq('character_id_used', id)
    .order('created_at', { ascending: false })

  if (contribError) {
    console.error('Failed to load creative contributions:', contribError)
  }

  const contribList = (contribData ?? []) as RawContribution[]
  const logEntries: CreationLogEntry[] = contribList.map((c) => {
    const gen = Array.isArray(c.generations) ? c.generations[0] : c.generations
    return {
      id: c.id,
      prompt_raw: c.prompt_raw,
      traits_included: c.traits_included,
      created_at: c.created_at,
      image_url: gen?.image_url ?? null,
    }
  })

  return (
    <main className="min-h-screen text-white" style={{ backgroundColor: '#0a0a0c' }}>
      <div className="max-w-5xl mx-auto px-6 py-12">
        <Link
          href="/characters"
          className="inline-block text-sm text-gray-400 hover:text-white transition mb-6"
        >
          ← Back to characters
        </Link>

        <EditableCharacterHeader
          characterId={character.id}
          name={character.name}
          description={character.description}
          traits={traits}
        />

        <SignaturePaletteEditor
          characterId={character.id}
          initialPalette={palette}
        />

        <section className="mb-10">
          {workCount > 0 ? (
            <>
              <h2
                className="text-xs font-semibold uppercase tracking-[0.2em] mb-4"
                style={{ color: '#F59E0B' }}
              >
                Consistent across {workCount}{' '}
                {workCount === 1 ? 'work' : 'works'}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {works.map((w, i) => (
                  <div
                    key={w.id}
                    className="group relative rounded-2xl overflow-hidden transition duration-200 hover:-translate-y-1"
                    style={{
                      backgroundColor: '#141318',
                      border: '1.5px solid #3a352a',
                    }}
                  >
                    <div
                      className="absolute top-3 right-3 z-10 text-xs font-medium px-2.5 py-1 rounded-full"
                      style={{
                        backgroundColor: 'rgba(10,10,12,0.75)',
                        color: '#e8e4da',
                        border: '1px solid #3a352a',
                      }}
                    >
                      {i + 1} / {workCount}
                    </div>
                    <div className="aspect-[2/3] bg-gray-950">
                      {w.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={w.image_url}
                          alt={character.name}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div
                      className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition duration-200"
                      style={{ border: '1.5px solid #F59E0B' }}
                    />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-16 px-6 border border-gray-800 rounded-2xl">
              <p className="text-gray-300 text-lg mb-2">
                No works yet with this character.
              </p>
              <p className="text-gray-500 text-sm italic mb-6 max-w-md">
                Generate variations and watch a consistent identity emerge.
              </p>
              <Link
                href="/create"
                className="px-5 py-2.5 rounded-lg font-medium transition"
                style={{ backgroundColor: '#F59E0B', color: '#0a0a0c' }}
              >
                Create a work →
              </Link>
            </div>
          )}
        </section>

        <CreationLog entries={logEntries} />
      </div>
    </main>
  )
}
