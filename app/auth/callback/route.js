import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/db/client";

function redirectTo(path, request) {
  return NextResponse.redirect(new URL(path, request.url));
}

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return redirectTo("/auth/login?error=expired", request);
  }

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session?.user) {
    return redirectTo("/auth/login?error=expired", request);
  }

  const authUser = data.session.user;
  if (!authUser.email) {
    return redirectTo("/auth/login?error=expired", request);
  }

  const { data: existingUser } = await supabase
    .from("users")
    .select("id, case_id")
    .eq("auth_user_id", authUser.id)
    .maybeSingle();

  if (!existingUser) {
    const { error: insertError } = await supabase.from("users").insert({
      auth_user_id: authUser.id,
      email: authUser.email,
      consent_emotion_shield: false,
      private_mode_enabled: false,
      created_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error("callback user insert error", insertError.message);
    }

    return redirectTo("/intake", request);
  }

  if (existingUser.case_id) {
    return redirectTo(`/dashboard/${existingUser.case_id}`, request);
  }

  return redirectTo("/intake", request);
}
