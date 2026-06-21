import OpenAI from "openai";
import { groq, CHAT_MODEL } from "./groq.js";

const isJudge = Boolean(process.env.GEMINI_API_KEY)

export const judgeClient = isJudge ? 
new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
}) : groq

export const JUDGE_MODEL = hasGemini ? "gemini-2.0-flash" : CHAT_MODEL;
export const JUDGE_PROVIDER = hasGemini ? "gemini" : "groq";