// src/app/auth/callback/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Success: redirect to the originally requested page (default: home)
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Failure: redirect to an error page (we'll build this in Step 4)
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
