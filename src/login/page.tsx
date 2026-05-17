// src/app/login/page.tsx
import { sendMagicLink } from './actions';

export default function LoginPage({
  searchParams,
}: {
  searchParams: { sent?: string; error?: string };
}) {
  const sent = searchParams.sent === 'true';
  const errorMessage = searchParams.error;

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            Sign in to Ownoid
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            We&apos;ll email you a magic link. No password needed.
          </p>
        </div>

        {sent ? (
          <div className="rounded-md bg-green-50 p-4 text-sm text-green-800">
            Check your inbox. We sent you a magic link to sign in.
          </div>
        ) : (
          <form action={sendMagicLink} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>

            {errorMessage && (
              <p className="text-sm text-red-600">{errorMessage}</p>
            )}

            <button
              type="submit"
              className="w-full rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
            >
              Send magic link
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
