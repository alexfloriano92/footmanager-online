import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Auth routes - redirect if already logged in
  if (user && request.nextUrl.pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Protected routes - redirect if not logged in
  const protectedPaths = ['/dashboard', '/club', '/squad', '/training', '/market', '/matches', '/competitions', '/finances', '/messages', '/rankings', '/achievements', '/admin'];
  const isProtected = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path));

  if (!user && isProtected) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // Onboarding check - redirect if user has no coach/club
  if (user && isProtected && !request.nextUrl.pathname.startsWith('/onboarding')) {
    const { data: coach } = await supabase
      .from('coaches')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!coach && !request.nextUrl.pathname.startsWith('/onboarding/coach')) {
      return NextResponse.redirect(new URL('/onboarding/coach', request.url));
    }

    if (coach) {
      const { data: clubOwner } = await supabase
        .from('club_owners')
        .select('club_id')
        .eq('coach_id', coach.id)
        .single();

      if (!clubOwner && !request.nextUrl.pathname.startsWith('/onboarding/club')) {
        return NextResponse.redirect(new URL('/onboarding/club', request.url));
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
