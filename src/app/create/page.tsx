import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CreateForm, { type Character } from './CreateForm'

export const metadata = {
  title: 'Create — Ownoid',
  description: 'Design your humanoid with AI.',
}

type TraitRow = { label: string; value: string }

export default async function CreatePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/create')
  }

  const { data: charactersData } = await supabase
    .from('characters')
    .select('id, name, distinctive_traits')
    .order('updated_at', { ascending: false })

  const characters: Character[] = (charactersData ?? []).map((c) => {
    const raw = c.distinctive_traits
    const traits: TraitRow[] = Array.isArray(raw) ? (raw as TraitRow[]) : []
    return {
      id: c.id as string,
      name: c.name as string,
      distinctive_traits: traits,
    }
  })

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">Create Your Humanoid</h1>
        <p className="text-gray-400 mb-8">
          Describe the humanoid you want to design.
        </p>
        <CreateForm characters={characters} />
      </div>
    </main>
  )
}
