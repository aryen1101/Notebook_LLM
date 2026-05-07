import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { QdrantVectorStore } from "@langchain/qdrant";
import OpenAI from "openai";
import { COLLECTION_NAME } from "../config/qdrant.js";

export async function chat(userQuery, history = []) {
  const embeddings = new HuggingFaceInferenceEmbeddings({
    apiKey: process.env.HF_API_KEY,
    model: "BAAI/bge-small-en-v1.5",
  });

  const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
  });

  const vectorStore = await QdrantVectorStore.fromExistingCollection(
    embeddings,
    {
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
      collectionName: COLLECTION_NAME,
    },
  );

  const results = await vectorStore.similaritySearch(userQuery, 4);

  const context = results
    .map(
      (doc, i) =>
        `[Source ${i + 1} | Page ${doc.metadata.loc?.pageNumber || "N/A"}]\n${doc.pageContent}`,
    )
    .join("\n\n---\n\n");

  const systemPrompt = `You are a helpful assistant. Use ONLY the following context to answer.
  If not found, say you don't know. Always cite the Source number.

CONTEXT:
${context}`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...history.slice(-4),
    { role: "user", content: userQuery },
  ];

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages,
    temperature: 0.1,
    max_tokens: 1024,
  });

  return {
    answer: response.choices[0].message.content,
    sources: results.map((r) => ({
      text: r.pageContent,
      page: r.metadata.loc?.pageNumber,
    })),
  };
}
