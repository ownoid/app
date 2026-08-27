import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gallery — Ownoid',
};

type Generation = {
  id: string;
  prompt: string;
  image_url: string;
  created_at: string;
};

export default async function GalleryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: generations, error } = await supabase
    .from('generations')
    .select('id, prompt, image_url, created_at')
    .order('created_at', { ascending: false });

  return (
    <main
      className="min-h-screen text-white"
      style={{ backgroundColor: '#0a0a0c' }}
    >
      <div className="px-6 py-12 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Your Gallery</h1>
          <Link
            href="/create"
            className="px-4 py-2 rounded-lg font-medium transition"
            style={{ backgroundColor: '#F59E0B', color: '#0a0a0c' }}
          >
            + New
          </Link>
        </div>

        {error && (
          <p className="text-red-400 mb-4">
            Failed to load your gallery. Please refresh and try again.
          </p>
        )}

        {!error && (!generations || generations.length === 0) && (
          <div className="text-center py-20 border border-gray-800 rounded-2xl">
            <p className="text-lg text-gray-300 mb-6">
              You haven&apos;t created any humanoids yet.
            </p>
            <Link
              href="/create"
              className="inline-block px-6 py-3 rounded-lg font-medium transition"
              style={{ backgroundColor: '#F59E0B', color: '#0a0a0c' }}
            >
              Create your first one
            </Link>
          </div>
        )}

        {generations && generations.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {generations.map((g: Generation) => (
              <div
                key={g.id}
                className="rounded-2xl overflow-hidden"
                style={{
                  backgroundColor: '#141318',
                  border: '1px solid #2a2620',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={g.image_url}
                  alt={g.prompt}
                  className="w-full aspect-[2/3] object-cover"
                  style={{ backgroundColor: '#0a0a0c' }}
                />
                <div className="p-3">
                  <p
                    className="text-sm line-clamp-2"
                    style={{ color: '#e8e4da' }}
                    title={g.prompt}
                  >
                    {g.prompt}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(g.created_at).toLocaleDateString('en-US')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
