import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // We specify a 'next' param if we want to redirect them dynamically, 
  // defaulting to /setup-profile for newly signed-in users
  const next = searchParams.get('next') ?? '/setup-profile';

  if (code) {
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch (error) {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing user sessions.
            }
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data.session) {
      const user = data.session.user;
      
      // Calculate time difference between account creation and current sign in
      // If it's less than 10 seconds, this is a brand new account created via Google
      const createdAt = new Date(user.created_at).getTime();
      const lastSignIn = new Date(user.last_sign_in_at || user.created_at).getTime();
      const isNewUser = Math.abs(createdAt - lastSignIn) < 10000;
      
      let finalNext = next;
      
      // If they are an existing user trying to go to setup-profile, send them home instead
      if (next === '/setup-profile' && !isNewUser) {
        finalNext = '/';
      }

      return NextResponse.redirect(`${origin}${finalNext}`);
    } else {
      // Redirect to login if there is a code but exchange failed
      return NextResponse.redirect(`${origin}/login?error=auth-code-exchange-failed`);
    }
  }

  // If there is no code, redirect to the `next` path.
  // This is required for implicit flow (like password reset) where the token is
  // in the URL fragment (#access_token=...) rather than query parameters.
  // The browser will preserve the hash fragment across redirects and the client-side
  // Supabase client will parse it and authenticate the user.
  return NextResponse.redirect(`${origin}${next}`);
}
