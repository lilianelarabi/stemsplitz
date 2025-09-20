const fetch = require("node-fetch");

exports.handler = async function (event) {
  try {
    console.log("AI plan function (Gemini) invoked");

    const { options, exercises } = JSON.parse(event.body || "{}");

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
You are a professional strength coach. 
Generate a structured workout plan in JSON based on ACSM/NSCA guidelines.

User filters:
${JSON.stringify(options)}

Exercise database (use only from these):
${JSON.stringify(exercises)}

⚠️ Output must be STRICT JSON only.
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
        statusCode: 500,
        body: JSON.stringify({ error: "Gemini API failed", details: text })
      };
    }

    const data = await response.json();
    console.log("Gemini raw response:", data);

    // Extract text response
    let raw =
      data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      JSON.stringify({ error: "No output" });

    let plan;
    try {
      plan = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      plan = match ? JSON.parse(match[0]) : { error: "Invalid AI response", raw };
    }

    return { statusCode: 200, body: JSON.stringify(plan) };
  } catch (err) {
    console.error("Function error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

