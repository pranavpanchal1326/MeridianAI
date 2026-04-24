import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/db/client";

export async function POST(request) {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();

  const response = NextResponse.json(
    { success: true, redirect: "/" },
    {
      status: 200,
    },
  );

  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith("sb-")) {
      response.cookies.set(cookie.name, "", {
        path: "/",
        expires: new Date(0),
      });
    }
  }

  return response;
}
