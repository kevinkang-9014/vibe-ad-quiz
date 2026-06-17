import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function toKST(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const secret = searchParams.get("secret");
  const campaignId = searchParams.get("campaign_id");

  if (!secret || secret !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  // 캠페인 ID 없으면 → 전체 캠페인 목록 반환
  if (!campaignId) {
    const { data, error } = await supabase
      .from("logs")
      .select("data")
      .not("data->campaign_id", "is", null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const campaignIds = [...new Set(
      data?.map((row) => (row.data as Record<string, unknown>)?.campaign_id as string).filter(Boolean) ?? []
    )];

    return NextResponse.json({ campaigns: campaignIds });
  }

  // 캠페인별 이벤트 집계 (user_id 포함)
  const { data, error } = await supabase
    .from("logs")
    .select("event, user_id, created_at")
    .eq("data->>campaign_id", campaignId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 이벤트별 집계 + 유니크 유저수 + 최초 로깅일
  const eventMap = new Map<string, { count: number; users: Set<string>; last_at: string }>();
  let firstAt: string | null = null;
  for (const row of data ?? []) {
    if (!firstAt || row.created_at < firstAt) firstAt = row.created_at;
    const existing = eventMap.get(row.event);
    if (existing) {
      existing.count++;
      existing.users.add(row.user_id);
    } else {
      eventMap.set(row.event, { count: 1, users: new Set([row.user_id]), last_at: toKST(row.created_at) });
    }
  }

  const events = Array.from(eventMap.entries()).map(([event, { count, users, last_at }]) => ({
    event,
    count,
    unique_users: users.size,
    last_at,
  }));

  // 요약 지표
  const uniqueUsers = (event: string) => eventMap.get(event)?.users.size ?? 0;
  const eventCount = (event: string) => eventMap.get(event)?.count ?? 0;
  const correctUsers = uniqueUsers("result_correct_view");
  const wrongUsers = uniqueUsers("result_wrong_view");
  const totalParticipants = correctUsers + wrongUsers;
  const hintClicks = eventCount("quiz_hint_click");
  const correctDetailClicks = eventCount("result_correct_detail_click");
  const alreadyDetailClicks = eventCount("already_participated_detail_click");

  const summary = {
    correct_users: correctUsers,
    wrong_users: wrongUsers,
    correct_rate: totalParticipants > 0 ? Math.round((correctUsers / totalParticipants) * 1000) / 10 : 0,
    wrong_rate: totalParticipants > 0 ? Math.round((wrongUsers / totalParticipants) * 1000) / 10 : 0,
    landing_hint: hintClicks,
    landing_correct_detail: correctDetailClicks,
    landing_already_detail: alreadyDetailClicks,
    landing_total: hintClicks + correctDetailClicks + alreadyDetailClicks,
  };

  // 최초 로깅일을 YYMMDD 포맷으로 (KST)
  let firstDateKST = "";
  if (firstAt) {
    const d = new Date(firstAt);
    const kst = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
    const yy = String(kst.getFullYear()).slice(2);
    const mm = String(kst.getMonth() + 1).padStart(2, "0");
    const dd = String(kst.getDate()).padStart(2, "0");
    firstDateKST = `${yy}${mm}${dd}`;
  }

  // 데일리 추이
  const dailyMap = new Map<string, { correct: Set<string>; wrong: Set<string>; hint: number; correctDetail: number; alreadyDetail: number }>();
  for (const row of data ?? []) {
    const dateKey = new Date(row.created_at).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });
    if (!dailyMap.has(dateKey)) {
      dailyMap.set(dateKey, { correct: new Set(), wrong: new Set(), hint: 0, correctDetail: 0, alreadyDetail: 0 });
    }
    const day = dailyMap.get(dateKey)!;
    if (row.event === "result_correct_view") day.correct.add(row.user_id);
    if (row.event === "result_wrong_view") day.wrong.add(row.user_id);
    if (row.event === "quiz_hint_click") day.hint++;
    if (row.event === "result_correct_detail_click") day.correctDetail++;
    if (row.event === "already_participated_detail_click") day.alreadyDetail++;
  }

  const daily = Array.from(dailyMap.entries())
    .map(([date, { correct, wrong, hint, correctDetail, alreadyDetail }]) => ({
      date,
      participants: correct.size + wrong.size,
      correct: correct.size,
      wrong: wrong.size,
      landing_hint: hint,
      landing_correct_detail: correctDetail,
      landing_already_detail: alreadyDetail,
      landing_total: hint + correctDetail + alreadyDetail,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // 경품 대상자 (정답 유저)
  const { data: winnersData } = await supabase
    .from("quiz_participations")
    .select("user_id, answer, created_at")
    .eq("campaign_id", campaignId)
    .eq("is_correct", true)
    .order("created_at", { ascending: true });

  const winners = (winnersData ?? []).map((w) => ({
    user_id: w.user_id,
    answer: w.answer,
    date: toKST(w.created_at),
  }));

  return NextResponse.json({
    campaign_id: campaignId,
    first_date: firstDateKST,
    total_events: data?.length ?? 0,
    summary,
    daily,
    events,
    winners,
    updated_at: toKST(new Date().toISOString()),
  });
}
