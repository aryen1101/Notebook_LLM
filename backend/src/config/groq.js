import OpenAI from "openai";

export const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

export const CHAT_MODEL = "llama-3.3-70b-versatile";
