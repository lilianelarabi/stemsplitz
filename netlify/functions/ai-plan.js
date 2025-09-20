const fetch = require("node-fetch");

exports.handler = async function(event) {
  try {
    const { options, exercises } = JSON.parse(event.body);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `
Generate a weekly training plan.
User filters:
${JSON.stringify(options)}

Exercise database (only pick from these):
${JSON.stringify(exercises)}

Format the output as JSON in this structure:
{
  "meta": { "level": "", "goal": "", "days": 3, "emphasis": "" },
  "days": [
    {
      "sessionType": "Upper",
      "warmup": [{ "name": "5–10 min light cardio + mobility", "sets": "1", "reps": "5–10 min" }],
      "exercises": [
        { "id": "barbell_bench", "name": "Barbell Bench Press", "sets": "3", "reps": "8–12", "isRehab": false }
      ]
    }
  ]
}
`
                }
              ]
            }
          ]
        })
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("Gemini API error:", text);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: "Gemini API failed", details: text })
      };
    }

    const data = await response.json();
    console.log("Gemini raw:", JSON.stringify(data));

    // Try to parse JSON inside response
    let raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    let plan;
    try {
      plan = JSON.parse(raw);
    } catch {
      const match = raw?.match(/\{[\s\S]*\}/);
      plan = match ? JSON.parse(match[0]) : { error: "Invalid Gemini response", raw };
    }

    return { statusCode: 200, body: JSON.stringify(plan) };
  } catch (err) {
    console.error("Function error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};


