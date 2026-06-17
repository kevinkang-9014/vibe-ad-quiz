import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (_supabase) return _supabase;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  _supabase = createClient(url, key);
  return _supabase;
}

export async function checkParticipation(userId: string, campaignId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  const { data } = await supabase
    .from("quiz_participations")
    .select("id")
    .eq("user_id", userId)
    .eq("campaign_id", campaignId)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

export async function recordParticipation(
  userId: string,
  campaignId: string,
  answer: string,
  isCorrect: boolean
) {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.from("quiz_participations").insert({
    user_id: userId,
    campaign_id: campaignId,
    answer,
    is_correct: isCorrect,
  });
}

export async function logEvent(
  userId: string | null,
  eventName: string,
  data?: Record<string, unknown>
) {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.from("logs").insert({
    user_id: userId ?? "anonymous",
    event: eventName,
    data: data ?? {},
  });
}
