// src/app/characters/[id]/page.tsx
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Character — Ownoid',
  description: 'Character detail.',
}

type TraitRow = { label: string; value: string }

export default async function CharacterDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = params
  const supabase = createClient()

  // 1) Auth guard (learning #32: full-stack next param)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=/characters/${id}`)
  }

  // 2) Fetch character (RLS auto-filters to own rows; explicit null check = defense in depth)
  const { data: character, error } = await supabase
    .from('characters')
    .select(
      'id, name, description, distinctive_traits, signature_palette, created_at, updated_at'
    )
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('Failed to load character:', error)
    notFound()
  }
  if (!character) {
    notFound()
  }

  // 3) Safe jsonb → TraitRow[] conversion (learning #38)
  const rawTraits = character.distinctive_traits
  const traits: TraitRow[] = Array.isArray(rawTraits)
    ? (rawTraits as TraitRow[])
    : []

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link
          href="/characters"
          className="inline-block text-sm text-gray-400 hover:text-white transition mb-6"
        >
          ← Back to characters
        </Link>

        <header className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight mb-3">
            {character.name}
          </h1>
          {character.description && (
            <p className="text-gray-300 text-lg leading-relaxed">
              {character.description}
            </p>
          )}
        </header>

        {traits.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
              Distinctive traits
            </h2>
            <dl className="space-y-2">
              {traits.map((t, i) => (
                <div
                  key={i}
                  className="flex gap-4 px-4 py-3 rounded-lg bg-gray-900 border border-gray-800"
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

        {/* CP-6-b: generations grid will go here */}
        {/* CP-6-c: signature_palette editor will go here */}
        {/* CP-6-d: Edit button will go here */}
      </div>
    </main>
  )
}
