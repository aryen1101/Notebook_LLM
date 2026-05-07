import fs from "fs";
import path from "path";

import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { Document } from "@langchain/core/documents";
import { parse } from "csv-parse/sync";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { QdrantVectorStore } from "@langchain/qdrant";

import { resetCollection, COLLECTION_NAME } from "../config/qdrant.js";

function getEmbeddings() {
  return new HuggingFaceInferenceEmbeddings({
    apiKey: process.env.HF_API_KEY,
    model: "BAAI/bge-small-en-v1.5",
  });
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

  if (chunks.length === 0) throw new Error("Document produced zero chunks.");

  await resetCollection();

  await QdrantVectorStore.fromDocuments(chunks, getEmbeddings(), {
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
    collectionName: COLLECTION_NAME,
  });

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