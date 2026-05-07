import "dotenv/config"
import { QdrantClient } from "@qdrant/js-client-rest";

export const qdrantClient = new QdrantClient({
    url : process.env.QDRANT_URL,
    apiKey : process.env.QDRANT_API_KEY,
})

export const COLLECTION_NAME = process.env.QDRANT_COLLECTION_NAME

export const VECTOR_SIZE = 384

export async function testConnection() {
  try {
    await qdrantClient.getCollections();
    console.log("Qdrant Cloud connected:", process.env.QDRANT_URL);
  } catch (err) {
    console.error("Failed to connect to Qdrant Cloud:", err.message);
    console.error("Check your QDRANT_URL and QDRANT_API_KEY in .env");
    process.exit(1);
  }
}

export async function resetCollection() {
  const { collections } = await qdrantClient.getCollections();
  const exists = collections.some((c) => c.name === COLLECTION_NAME);

  if (exists) {
    await qdrantClient.deleteCollection(COLLECTION_NAME);
    console.log("Deleted old collection");
  }

  await qdrantClient.createCollection(COLLECTION_NAME, {
    vectors: { size: VECTOR_SIZE, distance: "Cosine" },
  });

  console.log("Created fresh collection:", COLLECTION_NAME);
}


export async function isCollectionReady() {
  try {
    const info = await qdrantClient.getCollection(COLLECTION_NAME);
    return (info.points_count ?? 0) > 0;
  } catch {
    return false;
  }
}