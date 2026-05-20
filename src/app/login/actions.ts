// src/app/login/actions.ts
'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// Only allow internal paths; block external/protocol-relative URLs.
function sanitizeNext(value: FormDataEntryValue | null): string {
  if (typeof value !== 'string') return '/create';
  if (!value.startsWith('/')) return '/create';
  if (value.startsWith('//') || value.startsWith('/\\')) return '/create';
  return value;
}

export async function sendMagicLink(formData: FormData) {
  const next = sanitizeNext(formData.get('next'));
  const email = formData.get('email');

  if (typeof email !== 'string' || !email) {
    redirect(
      `/login?error=Please+enter+a+valid+email&next=${encodeURIComponent(next)}`,
    );
  }

  const origin = headers().get('origin') ?? 'https://app.ownoid.com';

  const supabase = createClient();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    redirect(
      `/login?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`,
    );
  }

  redirect(`/login?sent=true&next=${encodeURIComponent(next)}`);
}

export async function signInWithGoogle(formData: FormData) {
  const next = sanitizeNext(formData.get('next'));

  const origin = headers().get('origin') ?? 'https://app.ownoid.com';

  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    redirect(
      `/login?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`,
    );
  }

  if (data.url) {
    redirect(data.url);
  }

  redirect(
    `/login?error=Failed+to+initiate+Google+sign-in&next=${encodeURIComponent(next)}`,
  );
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
