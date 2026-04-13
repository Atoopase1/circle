import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // We specify a 'next' param if we want to redirect them dynamically, 
  // defaulting to /setup-profile for newly signed-in users
  const next = searchParams.get('next') ?? '/setup-profile';

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.headers.get('cookie') ? parseCookies(request.headers.get('cookie')!) : [];
          },
          setAll(cookiesToSet) {
            // We don't necessarily need to set them here for the response redirect,
            // but it's required by the API. The actual setting happens when we modify the NextResponse below.
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Create a redirect response to the desired Next.js page
      const response = NextResponse.redirect(`${origin}${next}`);
      
      // Setting cookies properly on the response
      const supabaseResponseClient = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.headers.get('cookie') ? parseCookies(request.headers.get('cookie')!) : [];
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) => {
                response.cookies.set(name, value, options as any);
              });
            },
          },
        }
      );
      
      // To ensure the cookies are set in the response, we must call getUser or getSession
      await supabaseResponseClient.auth.getUser();

      return response;
    }
  }

  // Redirect to login if there's an error or no code
  return NextResponse.redirect(`${origin}/login?error=auth-code-exchange-failed`);
}

function parseCookies(cookieHeader: string) {
  return cookieHeader.split(';').map(v => v.split('=')).map(([name, ...rest]) => ({
    name: name.trim(),
    value: rest.join('=').trim()
  }));
}
