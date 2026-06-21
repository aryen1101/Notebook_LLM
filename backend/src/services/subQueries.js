import { groq, CHAT_MODEL } from "../config/groq.js";

export async function decomposeQuery(query) {
  try {
    const response = await groq.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You split a user's question into the smallest set of focused " +
            "sub-questions needed to answer it from a document search engine. " +
            "If the question is already simple, return just that one question. " +
            "Return AT MOST 3. Reply ONLY with strict JSON: " +
            '{"subQueries": ["...", "..."]}',
        },
        { role: "user", content: query },
      ],
      temperature: 0,
      max_tokens: 200,
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(response.choices[0].message.content);
    const subQueries = Array.isArray(parsed.subQueries)
      ? parsed.subQueries
      : [];
    const all = [query, ...subQueries].map((q) => q.trim()).filter(Boolean);
    return [...new Set(all)].slice(0, 4);
  } catch {
    return [query];
  }
}
