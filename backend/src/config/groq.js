import OpenAI from "openai";

export const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

// llama-3.3-70b-versatile is no longer available to some developer accounts.
// GPT OSS 120B is Groq's recommended replacement for this workload.
export const CHAT_MODEL = "openai/gpt-oss-120b";
