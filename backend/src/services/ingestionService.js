import fs from "fs";
import path from "path";

import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { Document } from "@langchain/core/documents";
import { parse } from "csv-parse/sync";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/huggingface_transformers";
import { QdrantVectorStore } from "@langchain/qdrant";

import { resetCollection, COLLECTION_NAME } from "../config/qdrant.js";

function getEmbeddings() {
  return new HuggingFaceTransformersEmbeddings({ model: "Xenova/bge-small-en-v1.5" });
}

async function loadPDF(filePath) {
  const loader = new PDFLoader(filePath, { splitPages: true });
  return await loader.load();
}

async function loadTXT(filePath) {
  const text = fs.readFileSync(filePath, "utf-8");
  return [new Document({ pageContent: text, metadata: { source: path.basename(filePath) } })];
}

async function loadCSV(filePath) {
  const raw = fs.readFileSync(filePath, "utf-8");
  const records = parse(raw, { columns: true, skip_empty_lines: true });

  if (records.length === 0) throw new Error("CSV file is empty.");

  const ROWS_PER_CHUNK = 10;
  const chunks = [];

  for (let i = 0; i < records.length; i += ROWS_PER_CHUNK) {
    const batch = records.slice(i, i + ROWS_PER_CHUNK);

    const text = batch
      .map(
        (row, idx) =>
          `Row ${i + idx + 1}: ` +
          Object.entries(row)
            .map(([col, val]) => `${col}: ${val}`)
            .join(" | "),
      )
      .join("\n");

    chunks.push(
      new Document({
        pageContent: text,
        metadata: {
          source: path.basename(filePath),
          type: "csv",
          rowStart: i + 1,
          rowEnd: Math.min(i + ROWS_PER_CHUNK, records.length),
        },
      }),
    );
  }

  return chunks;
}

async function chunkDocuments(docs) {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
    separators: ["\n\n", "\n", ". ", " ", ""],
  });
  return await splitter.splitDocuments(docs);
}

export async function ingestDocument(filePath, fileType) {
  console.log(`\nIngesting: ${path.basename(filePath)} (${fileType})`);

  let rawDocs;
  if (fileType === "pdf") {
    rawDocs = await loadPDF(filePath);
  } else if (fileType === "txt") {
    rawDocs = await loadTXT(filePath);
  } else if (fileType === "csv") {
    rawDocs = await loadCSV(filePath);
  } else {
    throw new Error(`Unsupported file type: ${fileType}`);
  }

  const chunks = fileType === "csv" ? rawDocs : await chunkDocuments(rawDocs);

  console.log(`Chunks produced: ${chunks.length}`);

  if (chunks.length === 0) {
    const err = new Error(
      fileType === "pdf"
        ? "No text could be extracted from this PDF. It is probably a scanned or image-only PDF — run it through OCR (or export it as a text-based PDF) and upload again."
        : "The document is empty — no text could be extracted.",
    );
    err.status = 422;
    throw err;
  }

  // Embed BEFORE touching the index, so a failed or interrupted upload
  // (timeout, out-of-memory, bad file) leaves the previous document intact
  // instead of an empty collection.
  const embeddings = getEmbeddings();
  const vectors = await embeddings.embedDocuments(chunks.map((c) => c.pageContent));

  await resetCollection();

  const store = new QdrantVectorStore(embeddings, {
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
    collectionName: COLLECTION_NAME,
  });
  await store.addVectors(vectors, chunks);

  console.log(`Done — ${chunks.length} chunks stored in Qdrant`);

  return {
    fileName: path.basename(filePath),
    fileType,
    totalChunks: chunks.length,
    chunkingStrategy:
      fileType === "csv"
        ? "Row-batch (10 rows/chunk with column names)"
        : "RecursiveCharacterTextSplitter (size=1000, overlap=200)",
  };
}
