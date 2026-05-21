// app/characters/[id]/page.tsx
import { createClient } from '@/utils/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'

type TraitRow = { label: string; value: string }

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function CharacterDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = createClient()

  // 1) Auth guard
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=/characters/${id}`)
  }

  // 2) Fetch character (RLS auto-filters to own rows; explicit null check as defense in depth)
  const { data: character, error } = await supabase
    .from('characters')
    .select(
      'id, name, description, distinctive_traits, signature_palette, created_at, updated_at'
    )
    .eq('id', id)
    .maybeSingle()

  if (error || !character) {
    notFound()
  }

  // 3) Safe jsonb → TraitRow[] conversion (learning #38)
  const rawTraits = character.distinctive_traits
  const traits: TraitRow[] = Array.isArray(rawTraits)
    ? (rawTraits as TraitRow[])
    : []

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/characters"
        className="text-sm text-gray-500 hover:text-gray-900"
      >
        ← Back to characters
      </Link>

      <header className="mt-6">
        <h1 className="text-3xl font-semibold tracking-tight">
          {character.name}
        </h1>
        {character.description && (
          <p className="mt-3 text-gray-600">{character.description}</p>
        )}
      </header>

      {traits.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500">
            Distinctive traits
          </h2>
          <dl className="mt-3 space-y-2">
            {traits.map((t, i) => (
              <div
                key={i}
                className="flex gap-3 rounded-md border border-gray-200 px-3 py-2"
              >
                <dt className="min-w-[120px] font-medium text-gray-700">
                  {t.label}
                </dt>
                <dd className="text-gray-900">{t.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* CP-6-b: generations grid will go here */}
      {/* CP-6-c: signature_palette editor will go here */}
      {/* CP-6-d: Edit button will go here */}
    </main>
  )
}
