import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { authenticator } from "otplib";
import { createServerSupabaseClient } from "@/lib/db/client";

const redis = Redis.fromEnv();
const professionalLoginRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "15 m"),
  prefix: "ratelimit:professional-login",
  analytics: true,
});

function getClientIp(request) {
  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0].trim();
  }

  const xRealIp = request.headers.get("x-real-ip");
  if (xRealIp) {
    return xRealIp.trim();
  }

  return "unknown";
}

export async function POST(request) {
  let body;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  const totpCode = body.totp_code?.trim() ?? "";

  if (!email || !password || !totpCode) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const ipAddress = getClientIp(request);
  const rateLimitResult = await professionalLoginRateLimit.limit(`ip:${ipAddress}`);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        error: "too_many_attempts",
        locked_until: new Date(rateLimitResult.reset).toISOString(),
      },
      { status: 429 },
    );
  }

  const supabase = await createServerSupabaseClient();

  const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError || !authData.user) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const { data: professional, error: professionalError } = await supabase
    .from("professionals")
    .select("verification_status, totp_secret")
    .eq("auth_user_id", authData.user.id)
    .maybeSingle();

  if (professionalError || !professional || !professional.totp_secret) {
    await supabase.auth.signOut();
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const isTotpValid = authenticator.verify({
    token: totpCode,
    secret: professional.totp_secret,
  });

  if (!isTotpValid) {
    await supabase.auth.signOut();
    return NextResponse.json({ error: "invalid_totp" }, { status: 401 });
  }

  if (professional.verification_status === "pending") {
    return NextResponse.json({ error: "pending_verification" }, { status: 403 });
  }

  if (professional.verification_status === "rejected") {
    return NextResponse.json({ error: "account_rejected" }, { status: 403 });
  }

  if (professional.verification_status !== "verified") {
    return NextResponse.json({ error: "pending_verification" }, { status: 403 });
  }

  return NextResponse.json({ success: true, redirect: "/professional" }, { status: 200 });
}
