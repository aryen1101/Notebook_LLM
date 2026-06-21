import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { QdrantVectorStore } from "@langchain/qdrant";
import { COLLECTION_NAME } from "../config/qdrant.js";
import { groq, CHAT_MODEL } from "../config/groq.js";
import { detectLanguage, translate } from "./translator.js";
import { rewriteQuery } from "./queryRewriting.js";
import { decomposeQuery } from "./subQueries.js";
import { judgeAnswer, isContextRelevant } from "./llmJudge.js";

export async function chat(userQuery, history = []) {
  const embeddings = new HuggingFaceInferenceEmbeddings({
    apiKey: process.env.HF_API_KEY,
    model: "BAAI/bge-small-en-v1.5",
  });


  const looksEnglish = /^[\x00-\x7F]+$/.test(userQuery);
  let language = "English";
  let englishQuery = userQuery;
  if (!looksEnglish) {
    language = await detectLanguage(userQuery);
    if (!/english/i.test(language)) {
      englishQuery = await translate(userQuery, "English");
    }
  }
  const isEnglish = /english/i.test(language);

  const searchQuery = await rewriteQuery(englishQuery, history);

  const subQueries = await decomposeQuery(searchQuery);

  let contextBlock = "";
  let sources = [];
  let docUploaded = false;
  let contextRelevant = false;

  try {
    const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
      collectionName: COLLECTION_NAME,
    });
    docUploaded = true;
    const perQuery = await Promise.all(
      subQueries.map((q) => vectorStore.similaritySearch(q, 4)),
    );

    const seen = new Set();
    const merged = [];
    for (const doc of perQuery.flat()) {
      if (seen.has(doc.pageContent)) continue;
      seen.add(doc.pageContent);
      merged.push(doc);
    }

    const results = merged.slice(0, 6);

    if (results.length > 0) {
      contextBlock = results
        .map(
          (doc, i) =>
            `[Source ${i + 1} | Page ${doc.metadata.loc?.pageNumber || "N/A"}]\n${doc.pageContent}`,
        )
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

  async function generate(extraInstruction = "") {
    const response = await groq.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: systemPrompt + extraInstruction },
        ...history.slice(-4),
        { role: "user", content: englishQuery },
      ],
      temperature: 0.1,
      max_tokens: 1024,
    });
    return response.choices[0].message.content;
  }

  let answer;
  if (docUploaded && contextBlock) {
    const [genAnswer, relevant] = await Promise.all([
      generate(),
      isContextRelevant(englishQuery, contextBlock),
    ]);
    contextRelevant = relevant;
    if (!contextRelevant) {
      answer =
        "I couldn't find information relevant to your question in the uploaded document.";
      sources = [];
      contextBlock = "";
    } else {
      answer = genAnswer;
    }
  } else {
    answer = await generate();
  }

  let judgment = null;
  if (docUploaded && contextBlock) {
    judgment = await judgeAnswer(englishQuery, contextBlock, answer);

    const isBad =
      judgment &&
      (judgment.verdict === "hallucinated" || judgment.groundedness <= 2);

    if (isBad) {
      const retryAnswer = await generate(
        "\n\nIMPORTANT: A reviewer flagged your previous answer as NOT grounded " +
          "in the context. Answer again using ONLY facts explicitly stated in the " +
          "CONTEXT above and cite the Source number. If the context does not " +
          "contain the answer, simply say you don't know.",
      );
      const retryJudgment = await judgeAnswer(englishQuery, contextBlock, retryAnswer);

      if (
        retryJudgment &&
        (retryJudgment.groundedness || 0) >= (judgment.groundedness || 0)
      ) {
        answer = retryAnswer;
        judgment = retryJudgment;
      }
      if (judgment && judgment.verdict === "hallucinated") {
        answer =
          "I couldn't find a well-grounded answer to that in the uploaded document.";
      }
    }
  }
  if (!isEnglish) {
    answer = await translate(answer, language);
  }

  return {
    answer,
    sources,
    language,
    rewrittenQuery: searchQuery, 
    subQueries, 
    judgment,
  };
}
