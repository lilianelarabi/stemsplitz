const fetch = require("node-fetch");

exports.handler = async function(event) {
  try {
    const { options, exercises } = JSON.parse(event.body);

    // Lean metadata (strip down exercises for Gemini)
    const leanExercises = exercises.map(e => ({
      id: e.id,
      name: e.name,
      equipment: e.equipment,
      muscles: e.muscles,
      rehabSafe: e.rehabSafe ?? true
    }));

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
You are an expert strength & conditioning coach. 
Generate a weekly training plan following ACSM/NSCA evidence-based rules.

Strict rules:
- Respect all user filters: gender, level, goal, days, emphasis, equipment, pain.
- ALWAYS generate exactly the requested number of days.
- Use only exercises from this database: ${JSON.stringify(leanExercises)}.
- Avoid painful body parts, sub safe alternatives if needed.
- Program structure:
  * Compounds first, accessories second, core last.
  * Every week must include at least 2 core exercises.
- Level guidelines:
  * Beginner: 6–10 sets/muscle, 8–12 reps, basics only.
  * Intermediate: 10–16 sets, mix compounds & isolation.
  * Advanced: 12–20 sets, intensity techniques allowed.
- Goal guidelines:
  * Muscle: 3–5 sets, 6–12 reps, 65–80% 1RM.
  * Strength: 4–6 sets, 3–6 reps, long rests.
  * Fat loss: circuits, 8–15 reps, short rests.
  * Performance: combine strength (3–6), power (jumps/cleans), mobility.

Output strict JSON only:
{
  "meta": { "gender": "", "level": "", "goal": "", "days": 4, "emphasis": "", "equipment": [], "pain": [] },
  "days": [
    {
      "sessionType": "Upper",
      "warmup": [{ "name": "5–10 min light cardio + mobility", "sets": "1", "reps": "5–10 min" }],
      "exercises": [
        { "id": "barbell_bench", "sets": "4", "reps": "6–10" },
        { "id": "cable_row", "sets": "3", "reps": "8–12" },
        { "id": "plank", "sets": "3", "reps": "30–60s" }
      ]
    }
  ]
}
User filters:
${JSON.stringify(options)}
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

    // Try to parse Gemini’s JSON response
    let raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    let plan;
    try {
      plan = JSON.parse(raw.replace(/```json|```/g, "")); // clean markdown if present
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
