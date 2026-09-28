// Sur Next.js 16, "middleware.ts" est remplacé par "proxy.ts" (même
// fonctionnement, juste renommé — voir node_modules/next/dist/docs).
// Ce fichier rafraîchit la session Supabase (cookies) à chaque requête,
// pour que les Server Components voient un utilisateur toujours à jour.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Rafraîchit le token si besoin (nécessaire pour garder la session valide
  // côté Server Components, qui ne peuvent pas écrire de cookies eux-mêmes).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Espaces protégés : redirige vers la connexion si personne n'est
  // identifié. Le filtrage par rôle (un parent qui tente /enseignant, etc.)
  // est fait dans chaque layout, qui a déjà besoin de charger le profil.
  const isProtectedSpace =
    pathname.startsWith("/espace") ||
    pathname.startsWith("/enseignant") ||
    pathname.startsWith("/admin");
  if (isProtectedSpace && !user) {
    const redirectUrl = new URL("/connexion", request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
