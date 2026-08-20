const config = require("../config/config");
const logger = require("../utils/logger");

async function geminiEmbed(text) {
  const apiKey = config.geminiApiKey;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");
  const model = "gemini-embedding-001";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: `models/${model}`,
      content: { parts: [{ text }] },
      taskType: "RETRIEVAL_QUERY",
    }),
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Gemini embed failed: ${err}`);
  }
  const data = await resp.json();
  return data.embedding.values;
}

async function geminiAnswer(question, contextSegments, preferredLanguage = "English") {
  const apiKey = config.geminiApiKey;
  const preferredModels = ["gemini-3.6-flash", "gemini-2.5-flash", "gemini-flash-latest"];

  const contextText = contextSegments.map((s, i) =>
    `[Source ${i + 1}] Meeting: ${s.meeting_id} | ${s.speaker}: "${s.text}"`
  ).join("\n\n");

  const prompt = `You are NinaivuNet AI — an Organizational Intelligence Assistant.
Answer the user's question in their preferred language: "${preferredLanguage}".
Base your answer ONLY on the meeting transcript excerpts below.
If the answer is not contained in the transcripts, say "I couldn't find relevant information in the meeting records." in their preferred language.
Always cite which source(s) you used by referencing [Source N].

TRANSCRIPT EXCERPTS:
${contextText}

USER QUESTION: ${question}

ANSWER:`;

  let lastError = null;
  for (const model of preferredModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
          return data.candidates[0].content.parts[0].text;
        }
      } else {
        lastError = new Error(`Gemini answer failed on model ${model}: ${await resp.text()}`);
      }
    } catch (e) {
      lastError = e;
    }
  }

  throw lastError || new Error("Failed to get answer from Gemini API");
}

function cosineSimilarity(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot  += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

module.exports = {
  geminiEmbed,
  geminiAnswer,
  cosineSimilarity
};
