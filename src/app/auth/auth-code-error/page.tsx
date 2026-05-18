// src/app/auth/auth-code-error/page.tsx
import Link from 'next/link';

export default function AuthCodeErrorPage({
  searchParams,
}: {
  searchParams: { reason?: string };
}) {
  const reason = searchParams.reason;

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md space-y-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Sign-in link expired or invalid
        </h1>
        <p className="text-sm text-gray-600">
          Magic links expire after a few minutes and can only be used once.
          Please request a new one.
        </p>

        {reason && (
          <div className="rounded-md bg-gray-50 p-3 text-left text-xs text-gray-700">
            <p className="font-semibold mb-1">Debug info:</p>
            <p className="break-all">{reason}</p>
          </div>
        )}

        <Link
          href="/login"
          className="inline-block rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
