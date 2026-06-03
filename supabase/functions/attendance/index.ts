import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";

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

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "";

  // Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, message: "허용되지 않는 메서드입니다." }),
      { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders(origin) } },
    );
  }

  // ── 요청 파싱 ──────────────────────────────────────────────────────────
  let body: { id?: unknown; email?: unknown; classyn?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ success: false, message: "요청 본문이 올바르지 않습니다." }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders(origin) } },
    );
  }

  const memberId = body.id;
  const inputEmail = String(body.email ?? "").trim().toLowerCase();
  const classyn = body.classyn;

  if (!memberId || !inputEmail) {
    return new Response(
      JSON.stringify({ success: false, message: "id와 email은 필수입니다." }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders(origin) } },
    );
  }

  if (classyn !== "Y" && classyn !== "N") {
    return new Response(
      JSON.stringify({ success: false, message: "참석 유무 값이 올바르지 않습니다." }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders(origin) } },
    );
  }

  // ── Supabase 클라이언트 (service_role — 서버 전용) ─────────────────────
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // ── 멤버 조회 ──────────────────────────────────────────────────────────
  const { data: member, error: fetchError } = await supabase
    .from("vibe_coding_class_info")
    .select("id, email")
    .eq("id", memberId)
    .single();

  if (fetchError || !member) {
    return new Response(
      JSON.stringify({ success: false, message: "사용자를 찾을 수 없습니다." }),
      { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders(origin) } },
    );
  }

  // ── 이메일 인증 ────────────────────────────────────────────────────────
  const dbEmail = String(member.email ?? "").trim().toLowerCase();
  if (inputEmail !== dbEmail) {
    return new Response(
      JSON.stringify({ success: false, message: "사용자 인증에 실패 했습니다." }),
      { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders(origin) } },
    );
  }

  // ── 참석 정보 업데이트 ─────────────────────────────────────────────────
  const { error: updateError } = await supabase
    .from("vibe_coding_class_info")
    .update({ classyn })
    .eq("id", memberId);

  if (updateError) {
    console.error("UPDATE 오류:", updateError);
    return new Response(
      JSON.stringify({ success: false, message: "참석 정보 저장에 실패했습니다." }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders(origin) } },
    );
  }

  return new Response(
    JSON.stringify({ success: true, message: "참석 정보가 저장되었습니다." }),
    { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders(origin) } },
  );
});
