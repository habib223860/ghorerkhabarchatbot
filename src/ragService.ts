
// FIX: Added reference to node types to fix error on `process.cwd()`.
/// <reference types="node" />
// FIX: Per coding guidelines, using GoogleGenAI from @google/genai and modern APIs.
// The previous implementation used deprecated helpers and methods from an older version of the SDK.
import { GoogleGenAI } from "@google/genai";
import * as fs from "fs/promises";
import * as path from "path";

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });
const embeddingModelName = "text-embedding-004";
const generativeModelName = "gemini-2.5-flash";

// Simple in-memory vector store
interface Chunk {
  text: string;
  embedding: number[];
}
const knowledgeChunks: Chunk[] = [];

/**
 * Calculates the cosine similarity between two vectors.
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0.0;
  let normA = 0.0;
  let normB = 0.0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) {
    return 0;
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}


/**
 * Initializes the RAG system by loading the knowledge base from a file,
 * splitting it into chunks, generating embeddings, and storing them in-memory.
 */
export async function initializeRag() {
  console.log("Initializing RAG service...");
  try {
    const filePath = path.join(process.cwd(), "src", "knowledge.txt");
    const knowledgeBase = await fs.readFile(filePath, "utf-8");

    // Split the knowledge base into chunks based on sections (lines starting with #)
    const chunks = knowledgeBase
      .split(/^#\s/m)
      .filter((chunk) => chunk.trim().length > 0)
      .map((chunk) => `# ${chunk}`);

    console.log(`Loaded knowledge base. Found ${chunks.length} chunks. Generating embeddings...`);

    // Generate embeddings for all chunks in a batch
    const result = await ai.models.batchEmbedContents({
      model: embeddingModelName,
      requests: chunks.map((chunk) => ({
        content: { parts: [{ text: chunk }] },
      })),
    });

    const embeddings = result.embeddings;
    for (let i = 0; i < chunks.length; i++) {
      if (embeddings[i]?.values) {
        knowledgeChunks.push({
          text: chunks[i],
          embedding: embeddings[i].values,
        });
      }
    }
    
    console.log("Successfully added knowledge chunks to the vector store.");
    console.log("RAG service initialized and ready.");
  } catch (error) {
    console.error("Failed to initialize RAG service:", error);
    throw error; // Re-throw the error to halt server startup if initialization fails
  }
}

/**
 * Answers a user's question using the RAG pipeline.
 * It retrieves relevant context from the vector store and generates a response.
 * @param {string} question The user's question.
 * @returns {Promise<string>} The generated answer.
 */
export async function answerQuestion(question: string): Promise<string> {
  console.log(`Answering question: "${question}"`);
  if (knowledgeChunks.length === 0) {
    console.error("RAG service not initialized or no knowledge chunks available.");
    return "দুঃখিত, আমি এই মুহূর্তে উত্তর দিতে পারছি না কারণ আমার জ্ঞান ভান্ডার খালি।";
  }

  try {
    // 1. Embed the user's question
    const questionEmbeddingResult = await ai.models.embedContent({
      model: embeddingModelName,
      content: { parts: [{ text: question }] },
    });
    const questionEmbedding = questionEmbeddingResult.embedding.values;

    // 2. Find the most relevant chunks from the knowledge base
    const similarities = knowledgeChunks.map((chunk) => ({
      text: chunk.text,
      similarity: cosineSimilarity(questionEmbedding, chunk.embedding),
    }));

    similarities.sort((a, b) => b.similarity - a.similarity);

    // 3. Get top N chunks to use as context
    const topK = 3;
    const context = similarities
      .slice(0, topK)
      .map((s) => s.text)
      .join("\n\n---\n\n");

    // 4. Construct the prompt with context
    const prompt = `You are a helpful assistant for a business.
Use the following pieces of context to answer the user's question.
If you don't know the answer from the context, just say that you don't know, don't try to make up an answer.
Keep the answer concise and helpful. Respond in Bengali.

Context:
${context}

Question:
${question}

Answer:`;

    // 5. Generate the final answer
    const generativeResult = await ai.models.generateContent({
      model: generativeModelName,
      contents: prompt,
    });

    return generativeResult.text;
  } catch (error) {
    console.error("Error in RAG answerQuestion function:", error);
    return "দুঃখিত, একটি প্রযুক্তিগত সমস্যা হয়েছে। আমরা বিষয়টি দেখছি।";
  }
}
