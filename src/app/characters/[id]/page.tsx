// src/app/characters/[id]/page.tsx
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import SignaturePaletteEditor from './SignaturePaletteEditor'
import EditableCharacterHeader from './EditableCharacterHeader'

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

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <Link
          href="/characters"
          className="inline-block text-sm text-gray-400 hover:text-white transition mb-6"
        >
          ← Back to characters
        </Link>

        {/* CP-6-d: editable header (name / description / traits) */}
        <EditableCharacterHeader
          characterId={character.id}
          name={character.name}
          description={character.description}
          traits={traits}
        />

        {/* CP-6-c: signature_palette editor */}
        <SignaturePaletteEditor
          characterId={character.id}
          initialPalette={palette}
        />

        {/* CP-6-b: Generations linked to this character */}
        <section className="mb-10">
          {workCount > 0 ? (
            <>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">
                Consistent across {workCount}{' '}
                {workCount === 1 ? 'work' : 'works'}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {works.map((w) => (
                  <div
                    key={w.id}
                    className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden"
                  >
                    <div className="aspect-square bg-gray-950">
                      {w.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={w.image_url}
                          alt={character.name}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
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
                className="px-5 py-2.5 rounded-lg bg-white text-black font-medium hover:bg-gray-200 transition"
              >
                Create a work →
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
