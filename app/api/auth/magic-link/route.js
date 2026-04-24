import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { createServerSupabaseClient } from "@/lib/db/client";

const redis = Redis.fromEnv();
const magicLinkRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "1 h"),
  prefix: "ratelimit:magic-link",
  analytics: true,
});

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request) {
  let body;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const rateLimitResult = await magicLinkRateLimit.limit(`email:${email}`);
  if (!rateLimitResult.success) {
    const retryAfterSeconds = Math.max(1, Math.ceil((rateLimitResult.reset - Date.now()) / 1000));

    return NextResponse.json(
      { error: "too_many_requests", retry_after: retryAfterSeconds },
      { status: 429 },
    );
  }

  try {
    const supabase = await createServerSupabaseClient();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    if (!baseUrl) {
      throw new Error("Missing NEXT_PUBLIC_BASE_URL");
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${baseUrl}/auth/callback`,
        shouldCreateUser: true,
      },
    });

    if (error) {
      console.error("magic-link signInWithOtp error", error.message);
    }
  } catch (error) {
    console.error("magic-link route error", error);
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
