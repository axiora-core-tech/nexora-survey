import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  try {
    const { surveyTitle, responses, questionSummaries } = JSON.parse(event.body);

    const prompt = `You are an expert survey analyst. Analyze the following survey data and provide deep, actionable insights.

Survey: "${surveyTitle}"
Total Responses: ${responses.total}
Completion Rate: ${responses.completionRate}%

Question Summaries:
${JSON.stringify(questionSummaries, null, 2)}

Provide a JSON response with this exact structure:
{
  "insights": [
    {
      "type": "positive" | "warning" | "info" | "action",
      "title": "Short title (max 8 words)",
      "detail": "Detailed insight with specific numbers and actionable recommendations (2-3 sentences)",
      "metric": "optional key metric"
    }
  ],
  "executiveSummary": "2-3 sentence executive summary",
  "npsAnalysis": "NPS interpretation if applicable",
  "topStrengths": ["strength 1", "strength 2", "strength 3"],
  "improvementAreas": ["area 1", "area 2", "area 3"],
  "recommendedActions": [
    { "priority": "high|medium|low", "action": "specific action", "impact": "expected impact" }
  ]
}

Return ONLY the JSON, no markdown.`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].text;
    const analysis = JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim());

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(analysis),
    };
  } catch (err) {
    console.error("AI insights error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to generate insights" }),
    };
  }
};