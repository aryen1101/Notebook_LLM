import { judgeClient, JUDGE_MODEL } from "../config/gemini.js";

export async function judgeClient(question, context, answer) {
  try {
    const response = await judgeClient.chat.completions.create({
      model: JUDGE_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a strict evaluator of a RAG answer. You are given a QUESTION, " +
            "the CONTEXT that was retrieved from a document, and an ANSWER.\n" +
            "Score the answer on two axes from 1 (poor) to 5 (excellent):\n" +
            "- groundedness: are ALL claims supported by the CONTEXT? If the answer " +
            "uses outside knowledge or invents facts, score low.\n" +
            "- relevance: does the answer actually address the QUESTION?\n" +
            'Reply ONLY with strict JSON: {"groundedness": <1-5>, "relevance": ' +
            '<1-5>, "verdict": "<grounded|partially_grounded|hallucinated>", ' +
            '"reason": "<one short sentence>"}',
        },
        {
          role: "user",
          content: `QUESTION:\n${question}\n\nCONTEXT:\n${context}\n\nANSWER:\n${answer}`,
        },
      ],
      temperature: 0,
      max_tokens: 200,
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content);
  } catch {
    return null;
  }
}

export async function isContextRelevant(question, context) {
  try {
    const response = await judgeClient.chat.completions.create({
      model: JUDGE_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You decide whether a retrieved CONTEXT contains information that " +
            "can help answer a QUESTION. Be lenient — partial relevance counts. " +
            'Reply ONLY with strict JSON: {"relevant": true|false}',
        },
        {
          role: "user",
          content: `QUESTION:\n${question}\n\nCONTEXT:\n${context}`,
        },
      ],
      temperature: 0,
      max_tokens: 20,
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content).relevant !== false;
  } catch {
    return true;
  }
}
