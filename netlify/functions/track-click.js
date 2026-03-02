import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export const handler = async (event) => {
  const { token } = JSON.parse(event.body || "{}");
  if (!token) return { statusCode: 400, body: "Missing token" };

  await supabase.rpc("increment_click", { link_token: token });

  const { data: link } = await supabase
    .from("survey_links")
    .select("survey_id, status, surveys(*)")
    .eq("token", token)
    .single();

  return {
    statusCode: 200,
    headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
    body: JSON.stringify(link),
  };
};