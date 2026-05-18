// src/app/page.tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { signOut } from './login/actions';

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md space-y-10 text-center">
        <div>
          <h1 className="text-6xl font-bold tracking-tight text-white">
            Ownoid
          </h1>
          <p className="mt-3 text-sm text-gray-400">
            AI humanoid design platform — coming soon
          </p>
        </div>

        {user ? (
          <div className="space-y-4">
            <div className="rounded-md border border-gray-800 bg-gray-900 p-4 text-sm">
              <p className="text-gray-400">Signed in as</p>
              <p className="mt-1 font-medium text-white">{user.email}</p>
            </div>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-md border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-900"
              >
                Sign out
              </button>
            </form>
          </div>
        ) : (
          <Link
            href="/login"
            className="inline-block rounded-md bg-white px-6 py-2 text-sm font-medium text-black hover:bg-gray-200"
          >
            Sign in
          </Link>
        )}
      </div>
    </main>
  );
}
