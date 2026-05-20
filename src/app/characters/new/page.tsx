import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import NewCharacterForm from './NewCharacterForm'

export const metadata = {
  title: 'New Character — Ownoid',
  description: 'Define a distinctive humanoid character.',
}

export default async function NewCharacterPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/characters/new')
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="mb-8">
          <Link
            href="/characters"
            className="text-sm text-gray-500 hover:text-white transition"
          >
            ← My Characters
          </Link>
        </div>
        <h1 className="text-3xl font-bold mb-2">New Character</h1>
        <p className="text-gray-400 mb-8">
          Define a distinctive humanoid. Refine and register over time.
        </p>
        <NewCharacterForm />
      </div>
    </main>
  )
}
