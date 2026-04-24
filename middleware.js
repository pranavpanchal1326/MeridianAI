import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/db/client";

const PUBLIC_EXACT_ROUTES = new Set(["/", "/intake"]);
const PUBLIC_PREFIXES = ["/auth", "/api/auth"];

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/settlement",
  "/kids",
  "/settings",
  "/api/agents",
  "/api/ml",
  "/api/cases",
  "/api/documents",
];

const PROFESSIONAL_PREFIXES = ["/professional", "/api/professionals"];

function matchesPrefix(pathname, prefixes) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isPublicRoute(pathname) {
  if (PUBLIC_EXACT_ROUTES.has(pathname)) {
    return true;
  }
  return matchesPrefix(pathname, PUBLIC_PREFIXES);
}

function isProtectedRoute(pathname) {
  return matchesPrefix(pathname, PROTECTED_PREFIXES);
}

function isProfessionalRoute(pathname) {
  return matchesPrefix(pathname, PROFESSIONAL_PREFIXES);
}

function redirectToLogin(request) {
  const redirectUrl = new URL("/auth/login", request.url);
  const originalPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  redirectUrl.searchParams.set("redirect", originalPath);
  return NextResponse.redirect(redirectUrl);
}

export async function middleware(request) {
  const pathname = request.nextUrl.pathname;
  const response = NextResponse.next();

  const supabase = await createServerSupabaseClient({
    getAll: () =>
      request.cookies.getAll().map((cookie) => ({
        name: cookie.name,
        value: cookie.value,
      })),
    setAll: (cookiesToSet) => {
      for (const cookie of cookiesToSet) {
        response.cookies.set(cookie.name, cookie.value, cookie.options);
      }
    },
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (isPublicRoute(pathname)) {
    return response;
  }

  if (isProtectedRoute(pathname) && !session) {
    return redirectToLogin(request);
  }

  let role = "user";

  if (isProfessionalRoute(pathname)) {
    if (!session?.user) {
      return NextResponse.redirect(new URL("/auth/professional-login", request.url));
    }

    const { data: professional } = await supabase
      .from("professionals")
      .select("verification_status")
      .eq("auth_user_id", session.user.id)
      .maybeSingle();

    if (!professional) {
      return NextResponse.redirect(new URL("/auth/professional-login", request.url));
    }

    if (professional.verification_status === "pending") {
      if (pathname !== "/professional/pending") {
        return NextResponse.redirect(new URL("/professional/pending", request.url));
      }
      role = "professional";
      response.headers.set("x-user-role", role);
      return response;
    }

    if (professional.verification_status === "rejected") {
      if (pathname !== "/professional/rejected") {
        return NextResponse.redirect(new URL("/professional/rejected", request.url));
      }
      role = "professional";
      response.headers.set("x-user-role", role);
      return response;
    }

    if (professional.verification_status !== "verified") {
      return NextResponse.redirect(new URL("/auth/professional-login", request.url));
    }

    role = "professional";
  }

  if (isProtectedRoute(pathname) || isProfessionalRoute(pathname)) {
    response.headers.set("x-user-role", role);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
