import { CHAT_MODEL, groq } from "../config/groq";

export async function detectLanguage(text) {
  const response = await groq.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are a language detector. Reply with ONLY the English name of the " +
          "language the user's text is written in (e.g. 'English', 'Hindi', " +
          "'Spanish'). No punctuation, no extra words.",
      },
      { role: "user", content: text },
    ],
    temperature: 0,
    max_tokens: 10,
  });

  return response.choices[0].message.content.trim();
}

export async function translate(text, targetLanguage) {
  const response = await groq.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      {
        role: "system",
        content:
          `Translate the user's text into ${targetLanguage}. ` +
          "First silently fix any obvious typos or spelling mistakes in the " +
          "source, but NEVER change its meaning or add new information. " +
          "Output ONLY the translation — no notes, no quotes, no explanations. " +
          "Preserve any markdown formatting and source citations exactly.",
      },
      { role: "user", content: text },
    ],
    temperature: 0,
    max_tokens: 1024,
  });
}

export async function normalizeText(text) {
  try {
    const response = await groq.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a spelling and grammar fixer. Correct any typos, spelling " +
            "and obvious grammar mistakes in the user's text. Do NOT change the " +
            "meaning, do NOT answer it, do NOT add or remove information. " +
            "Output ONLY the corrected text — nothing else.",
        },
        { role: "user", content: text },
      ],
      temperature: 0,
      max_tokens: 200,
    });

    return response.choices[0].message.content.trim() || text;
  } catch {
    return text;
  }
}
