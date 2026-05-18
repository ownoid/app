import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CreateForm from './CreateForm'

export const metadata = {
  title: 'Create — Ownoid',
  description: 'Design your humanoid with AI.',
}

export default async function CreatePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">Create Your Humanoid</h1>
        <p className="text-gray-400 mb-8">
          Describe the humanoid you want to design.
        </p>
        <CreateForm />
      </div>
    </main>
  )
}
