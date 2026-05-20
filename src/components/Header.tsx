import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function Header() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b bg-white">
      <nav className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="font-bold text-lg hover:text-gray-700 transition"
        >
          Ownoid
        </Link>
        {user && (
          <div className="flex items-center gap-6">
            <Link
              href="/characters"
              className="text-sm font-medium hover:text-gray-600 transition"
            >
              Characters
            </Link>
            <Link
              href="/create"
              className="text-sm font-medium hover:text-gray-600 transition"
            >
              Create
            </Link>
            <Link
              href="/gallery"
              className="text-sm font-medium hover:text-gray-600 transition"
            >
              Gallery
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
