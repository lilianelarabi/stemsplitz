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
You are an expert strength & conditioning coach. Generate weekly training plans using ACSM/NSCA evidence-based guidelines, structured for hypertrophy, strength, fat loss, endurance, or performance.

Strict rules:

1. Respect all user filters:
   - Gender: neutral programming unless relevant (rehab load differences).
   - Level:
     • Beginner: 6–10 weekly sets per muscle group, compounds prioritized, 8–12 reps.
     • Intermediate: 10–16 sets, mix compounds & isolation, more variation.
     • Advanced: 12–20 sets, intensity techniques (supersets, drop sets optional).
   - Days per week: ALWAYS generate exactly the requested number of training days.
   - Primary goal:
     • Build muscle: compounds + isolations, 8–12 reps, 65–80% 1RM.
     • Strength: compounds, 3–6 reps, long rest, include assistance lifts.
     • Maintain: 2–4 days, moderate volume, 8–12 reps.
     • Fat loss: full body, circuits/giant sets, 8–15 reps, short rest.
     • Sports performance: combine strength (3–6 reps), power (plyos, Olympic lifts if equipment allows), mobility.
   - Training emphasis:
     • Balanced: distribute volume evenly across all major muscles.
     • Upper focus: add more chest/back/shoulders/arms.
     • Lower focus: add more quads/hamstrings/glutes/calves.
     • Power: Olympic lift patterns (barbell clean, push press), jumps, speed work.
     • Endurance: 15–20+ reps, lighter loads, circuits.
   - Equipment: only choose exercises from the provided database matching available equipment (barbells, dumbbells, long dumbbells, cables, bands, bodyweight, pull-up bar).
   - Painful body part(s): exclude stress-heavy moves (e.g. no overhead press with shoulder pain). Sub in “pain_safe” alternatives.

2. Programming rules:
   - Split sessions by emphasis and muscles:
     • Upper (chest, back, shoulders, arms).
     • Lower (quads, hamstrings, glutes, calves).
     • Push (chest, shoulders, triceps).
     • Pull (back, biceps).
     • Core (rectus abdominis, obliques, transverse abdominis, lower back stability).
   - Every week MUST include core work: planks, hanging leg raises, cable woodchops, Russian twists, ab rollouts, etc.
   - Exercise order:
     • Compounds first (squats, deadlifts, presses, rows, pull-ups).
     • Accessories second (lunges, curls, flys, lateral raises).
     • Finishers/core last.
   - Use all equipment efficiently:
     • Barbell = max strength & overload (squats, presses, deads).
     • Dumbbells = unilateral stability & range (lunges, presses, flys).
     • Long dumbbells = ham curls, preacher curls, hip thrust variations.
     • Cable machine = constant tension (lat pulldown, triceps pushdowns, face pulls).
     • Resistance bands = joint-friendly activation & rehab (band pull-aparts, monster walks).
     • Pull-up bar = vertical pulling & core (pull-ups, hanging raises).
     • Bodyweight = push-ups, planks, dips, step-ups.
   - Sets/reps:
     • Hypertrophy: 3–5 sets, 6–12 reps.
     • Strength: 4–6 sets, 3–6 reps.
     • Endurance: 2–4 sets, 15–20+ reps.
   - Rest periods:
     • Strength: 2–4 min.
     • Hypertrophy: 60–90s.
     • Endurance/Fat loss: 30–60s.

3. JSON output format (strict):
{
  "meta": { "gender": "", "level": "", "goal": "", "days": 4, "emphasis": "", "equipment": [], "pain": [] },
  "days": [
    {
      "sessionType": "Upper",
      "warmup": [{ "name": "5–10 min light cardio + mobility", "sets": "1", "reps": "5–10 min" }],
      "exercises": [
        { "id": "barbell_bench", "name": "Barbell Bench Press", "sets": "4", "reps": "6–10", "isRehab": false },
        { "id": "cable_row", "name": "Cable Row", "sets": "3", "reps": "8–12", "isRehab": false },
        { "id": "plank", "name": "Plank", "sets": "3", "reps": "30–60s", "isRehab": false }
      ]
    }
  ]
}

4. No explanations, no markdown, no extra text. Return valid JSON only.

User filters:
${JSON.stringify(options, null, 2)}

Exercise database (only pick from these):
${JSON.stringify(exercises, null, 2)}
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

    // Extract text from Gemini response
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
