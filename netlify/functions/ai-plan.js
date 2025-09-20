// netlify/functions/ai-plan.js
import fetch from "node-fetch";

export async function handler(event) {
  try {
    const { options, exercises } = JSON.parse(event.body);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a professional strength coach. Generate workout plans based on ACSM/NSCA guidelines."
          },
          {
            role: "user",
            content: `
User filters:
${JSON.stringify(options)}

Exercise database (use only from these):
${JSON.stringify(exercises)}

Format output as strict JSON:
{meta:{}, days:[{sessionType, warmup, exercises:[{id,name,sets,reps,tempo,notes}]}]}
`
          }
        ],
        temperature: 0.7,
        max_tokens: 1200
      })
    });

    const data = await response.json();
    const plan = JSON.parse(data.choices[0].message.content);

    return { statusCode: 200, body: JSON.stringify(plan) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
