const fetch = require("node-fetch");

exports.handler = async function(event) {
  try {
    const { options, exercises } = JSON.parse(event.body);

    // Send only minimal info to Gemini (id, name, equipment, rehab-safe)
    const exerciseMap = {};
    const exerciseList = exercises.map(ex => {
      exerciseMap[ex.id] = ex; // Keep for later merging
      return { id: ex.id, name: ex.name, equipment: ex.equipment, isRehab: ex.isRehab || false };
    });

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
You are an expert strength & conditioning coach. Generate a weekly training plan using evidence-based ACSM/NSCA guidelines.

Rules:
- Respect ALL user filters:
  Gender: ${options.gender}
  Level: ${options.level}
  Days: ${options.days}
  Goal: ${options.goal}
  Emphasis: ${options.emphasis}
  Equipment: ${options.equipment.join(", ")}
  Pain: ${options.pain.join(", ")}

- Select ONLY from this exercise database:
${JSON.stringify(exerciseList)}

- Always return EXACTLY the number of training days requested.
- Each day: warm-up, 5–8 main exercises, 1–2 core/finisher exercises.
- Follow strict training science (hypertrophy, strength, endurance, fat loss, performance).
- Use equipment efficiently (barbell for overload, cables for constant tension, bands for activation, etc.).
- Replace painful moves with pain-safe alternatives.

JSON OUTPUT ONLY:
{
  "meta": { "gender": "", "level": "", "goal": "", "days": 4, "emphasis": "", "equipment": [], "pain": [] },
  "days": [
    {
      "sessionType": "Upper",
      "warmup": [{ "name": "5–10 min light cardio + mobility", "sets": "1", "reps": "5–10 min" }],
      "exercises": [
        { "id": "barbell_bench_press", "sets": "4", "reps": "6–10" },
        { "id": "cable_row", "sets": "3", "reps": "8–12" }
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
      return { statusCode: response.status, body: JSON.stringify({ error: "Gemini API failed", details: text }) };
    }

    const data = await response.json();
    let raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    let plan;
    try {
      plan = JSON.parse(raw.replace(/```json|```/g, "").trim());
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
