import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
const VALID_DATES    = ["2026-06-16", "2026-06-17"];
const MAX_SEATS      = 9;

function corsHeaders(origin: string) {
  const allowed =
    ALLOWED_ORIGIN === "*" || origin === ALLOWED_ORIGIN
      ? origin
      : ALLOWED_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function json(body: unknown, status: number, origin: string) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "";

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (req.method !== "POST") {
    return json({ success: false, message: "허용되지 않는 메서드입니다." }, 405, origin);
  }

  let body: {
    action?: unknown;
    id?: unknown;
    email?: unknown;
    classyn?: unknown;
    name?: unknown;
    meetingdate?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return json({ success: false, message: "요청 본문이 올바르지 않습니다." }, 400, origin);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // ── 기타 멤버 추가 ─────────────────────────────────────────────────────
  if (body.action === "add") {
    const name  = String(body.name  ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!name || !email) {
      return json({ success: false, message: "이름과 이메일은 필수입니다." }, 400, origin);
    }

    const addDate = VALID_DATES.includes(String(body.meetingdate ?? ""))
      ? String(body.meetingdate)
      : VALID_DATES[0];

    // 서버 측 정원 체크
    const { count: seatCount } = await supabase
      .from("vibe_coding_class_info")
      .select("id", { count: "exact", head: true })
      .eq("classyn", "Y")
      .eq("meetingdate", addDate);

    if ((seatCount ?? 0) >= MAX_SEATS) {
      return json({ success: false, message: "정원을 초과 하였습니다." }, 200, origin);
    }

    const { data, error } = await supabase
      .from("vibe_coding_class_info")
      .insert({ name, email, dept: "기타", classyn: "Y", seqno: "9999", meetingdate: addDate })
      .select("id")
      .single();

    if (error) {
      console.error("INSERT 오류:", error);
      return json({ success: false, message: "추가에 실패했습니다." }, 500, origin);
    }
    return json({ success: true, message: "참석 정보가 추가되었습니다.", id: data.id }, 200, origin);
  }

  // ── 기타 멤버 삭제 ─────────────────────────────────────────────────────
  if (body.action === "delete") {
    if (!body.id) {
      return json({ success: false, message: "id는 필수입니다." }, 400, origin);
    }
    const { error } = await supabase
      .from("vibe_coding_class_info")
      .delete()
      .eq("id", body.id)
      .eq("dept", "기타");

    if (error) {
      console.error("DELETE 오류:", error);
      return json({ success: false, message: "삭제에 실패했습니다." }, 500, origin);
    }
    return json({ success: true, message: "삭제되었습니다." }, 200, origin);
  }

  // ── 참석 등록 ───────────────────────────────────────────────────────────
  const memberId   = body.id;
  const inputEmail = String(body.email ?? "").trim().toLowerCase();
  const classyn    = body.classyn;

  if (!memberId || !inputEmail) {
    return json({ success: false, message: "id와 email은 필수입니다." }, 400, origin);
  }
  if (classyn !== "Y" && classyn !== "N") {
    return json({ success: false, message: "참석 유무 값이 올바르지 않습니다." }, 400, origin);
  }

  // 이메일 인증
  const { data: member, error: fetchError } = await supabase
    .from("vibe_coding_class_info")
    .select("id, email")
    .eq("id", memberId)
    .single();

  if (fetchError || !member) {
    return json({ success: false, message: "사용자를 찾을 수 없습니다." }, 404, origin);
  }
  if (inputEmail !== String(member.email ?? "").trim().toLowerCase()) {
    return json({ success: false, message: "사용자 인증에 실패 했습니다." }, 401, origin);
  }

  // meetingdate 결정
  const rawDate     = String(body.meetingdate ?? "").trim();
  const meetingdate = (classyn === "Y" && VALID_DATES.includes(rawDate)) ? rawDate : null;

  // 참석(Y) — 회차 유효성 및 서버 측 정원 체크 (자신 제외)
  if (classyn === "Y") {
    if (!meetingdate) {
      return json({ success: false, message: "참석 회차를 올바르게 선택해 주세요." }, 400, origin);
    }
    const { count: seatCount } = await supabase
      .from("vibe_coding_class_info")
      .select("id", { count: "exact", head: true })
      .eq("classyn", "Y")
      .eq("meetingdate", meetingdate)
      .neq("id", memberId);

    if ((seatCount ?? 0) >= MAX_SEATS) {
      return json({ success: false, message: "정원을 초과 하였습니다." }, 200, origin);
    }
  }

  const { error: updateError } = await supabase
    .from("vibe_coding_class_info")
    .update({ classyn, meetingdate })
    .eq("id", memberId);

  if (updateError) {
    console.error("UPDATE 오류:", updateError);
    return json({ success: false, message: "참석 정보 저장에 실패했습니다." }, 500, origin);
  }

  return json({ success: true, message: "참석 정보가 저장되었습니다." }, 200, origin);
});
