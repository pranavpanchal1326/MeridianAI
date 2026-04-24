import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/db/client";
import { CHANNELS } from "@/lib/realtime/channels";

/**
 * @param {import("next/server").NextRequest} request
 */
export async function GET(request) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const roleHeader = request.headers.get("x-user-role");
  let role = roleHeader === "professional" ? "professional" : "user";

  if (roleHeader !== "user" && roleHeader !== "professional") {
    const { data: fallbackProfessionalId } = await supabase.rpc("get_professional_id", {
      user_auth_id: session.user.id,
    });

    if (fallbackProfessionalId) {
      role = "professional";
    }
  }

  if (role === "user") {
    const { data: caseIdData, error: caseIdError } = await supabase.rpc("get_user_case_id", {
      user_auth_id: session.user.id,
    });

    if (caseIdError) {
      console.error("[Realtime] get_user_case_id failed:", caseIdError.message);
      return NextResponse.json({ error: "no_case" }, { status: 404 });
    }

    const caseId = Array.isArray(caseIdData) ? caseIdData[0] : caseIdData;

    if (!caseId) {
      return NextResponse.json({ error: "no_case" }, { status: 404 });
    }

    const { data: userRow } = await supabase
      .from("users")
      .select("consent_emotion_shield")
      .eq("auth_user_id", session.user.id)
      .maybeSingle();

    const emotionShieldEnabled = Boolean(userRow?.consent_emotion_shield);

    return NextResponse.json({
      channels: {
        status: CHANNELS.caseStatus(caseId),
        decisions: CHANNELS.caseDecisions(caseId),
        documents: CHANNELS.caseDocuments(caseId),
        deadlines: CHANNELS.caseDeadlines(caseId),
        predictions: CHANNELS.casePredictions(caseId),
        alerts: emotionShieldEnabled ? CHANNELS.caseAlerts(caseId) : null,
      },
      case_id: caseId,
    });
  }

  const { data: professionalIdData, error: professionalIdError } = await supabase.rpc(
    "get_professional_id",
    {
      user_auth_id: session.user.id,
    },
  );

  if (professionalIdError) {
    console.error("[Realtime] get_professional_id failed:", professionalIdError.message);
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const professionalId = Array.isArray(professionalIdData)
    ? professionalIdData[0]
    : professionalIdData;

  if (!professionalId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    channels: {
      tasks: CHANNELS.professionalTasks(professionalId),
    },
    professional_id: professionalId,
  });
}
