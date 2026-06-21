import { CHAT_MODEL, groq } from "../config/groq";

export async function rewriteQuery(query, history = []) {
  const transcript = history
    .slice(-4)
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  const response = await groq.chat.completions.create({
    model: CHAT_MODEL,
  });

  const response = await groq.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You rewrite a user's question into ONE standalone search query for a " +
          "document search engine. Resolve pronouns and references using the " +
          "conversation so the query makes sense on its own. Keep the important " +
          "keywords. Output ONLY the rewritten query — no quotes, no explanation.",
      },
      {
        role: "user",
        content:
          (transcript ? `Conversation so far:\n${transcript}\n\n` : "") +
          `Question to rewrite: ${query}`,
      },
    ],
    temperature: 0,
    max_tokens: 100,
  });

  const newQuery = response.choices[0].message.content.trim()
  return newQuery || query;
}
