import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405 };

  const { responseId, linkToken, surveyId, answers, isComplete } = JSON.parse(event.body);

  // Upsert response record
  const { data: response } = await supabase
    .from("responses")
    .upsert({
      id: responseId,
      survey_id: surveyId,
      survey_link_id: linkToken,
      status: isComplete ? "completed" : "in_progress",
      ...(isComplete ? { completed_at: new Date().toISOString() } : {}),
    })
    .select()
    .single();

  // Only insert new answers (never update — immutability enforced by DB trigger)
  if (answers?.length) {
    const { data: existing } = await supabase
      .from("answers")
      .select("question_id")
      .eq("response_id", responseId);

    const existingQIds = new Set(existing?.map(a => a.question_id) || []);
    const newAnswers = answers
      .filter(a => !existingQIds.has(a.questionId))
      .map(a => ({ response_id: responseId, question_id: a.questionId, value: a.value }));

    if (newAnswers.length) {
      await supabase.from("answers").insert(newAnswers);
    }
  }

  return {
    statusCode: 200,
    headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
    body: JSON.stringify({ responseId: response.id }),
  };
};