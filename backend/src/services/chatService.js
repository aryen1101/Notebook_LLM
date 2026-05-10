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

  let contextBlock = "";
  let sources = [];
  let docUploaded = false;

  try {
    const vectorStore = await QdrantVectorStore.fromExistingCollection(
      embeddings,
      {
        url: process.env.QDRANT_URL,
        apiKey: process.env.QDRANT_API_KEY,
        collectionName: COLLECTION_NAME,
      },
    );

    const results = await vectorStore.similaritySearch(userQuery, 4);
    docUploaded = true;

    if (results.length > 0) {
      contextBlock = results
        .map((doc, i) => `[Source ${i + 1} | Page ${doc.metadata.loc?.pageNumber || "N/A"}]\n${doc.pageContent}`)
        .join("\n\n---\n\n");

      sources = results.map((r) => ({
        text: r.pageContent,
        page: r.metadata.loc?.pageNumber,
      }));
    }
  } catch {
    docUploaded = false;
  }

  let systemPrompt;

  if (!docUploaded) {
    systemPrompt = `You are a helpful assistant. No document has been uploaded yet. No matter what the user asks, do not answer any questions. Only tell them to upload a PDF, TXT, or CSV file first.`;
  } else if (contextBlock) {
    systemPrompt = `You are a helpful assistant. Answer ONLY using the context below. If the answer is not in the context, say you don't know. Always cite the Source number.

CONTEXT:
${contextBlock}`;
  } else {
    systemPrompt = `You are a helpful assistant. A document is uploaded but no relevant content was found for this question. Tell the user no relevant information was found in the document for their query.`;
  }

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      ...history.slice(-4),
      { role: "user", content: userQuery },
    ],
    temperature: 0.1,
    max_tokens: 1024,
  });

  return {
    answer: response.choices[0].message.content,
    sources,
  };
}