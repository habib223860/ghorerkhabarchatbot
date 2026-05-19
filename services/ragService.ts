import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// ✅ FIX: Proper state management for RAG service
let knowledgeChunks: string[] = [];
let isInitialized = false;

/**
 * ✅ FIX: Initialize RAG by loading knowledge base from file
 * Prevents "RAG service not initialized" error
 */
export async function initializeRAG(): Promise<void> {
  const knowledgeFile = path.join(__dirname, '../data/knowledge.txt');

  // Check if knowledge file exists
  if (!fs.existsSync(knowledgeFile)) {
    console.warn('⚠️  knowledge.txt not found. Creating sample file...');
    // Create sample knowledge base for "Ghorer Khabar" food delivery
    const sampleKnowledge = `
ঘরের খাবার একটি হোম ফুড ডেলিভারি সার্ভিস।
আমরা প্রতিদিন সকাল ৮টা থেকে রাত ১০টা পর্যন্ত ডেলিভারি দিই।
আমাদের মেনুতে ভাত, ডাল, মাছ, মাংস, সবজি এবং বিভিন্ন ধরনের বাংলাদেশি খাবার রয়েছে।
ডেলিভারি চার্জ ঢাকার মধ্যে ৩০-৫০ টাকা।
অর্ডার করতে আমাদের পেজে মেসেজ করুন অথবা ফোন করুন: 01XXXXXXXXX।
ন্যূনতম অর্ডার ১৫০ টাকা।
পেমেন্ট: বিকাশ, নগদ, ক্যাশ অন ডেলিভারি।
সাপ্তাহিক বন্ধ: কোনো বন্ধ নেই, প্রতিদিন সার্ভিস চালু।
ভাতের প্যাকেজ: ৮০ টাকা (ভাত + ডাল + সবজি)।
ফিশ প্যাকেজ: ১৫০ টাকা (ভাত + মাছ + ডাল + সবজি)।
চিকেন প্যাকেজ: ১৮০ টাকা (ভাত + চিকেন + ডাল + সবজি)।
বিশেষ অফার: ৫টি অর্ডারে ১টি ফ্রি।
আমাদের খাবার সম্পূর্ণ স্বাস্থ্যকর এবং তাজা উপকরণ দিয়ে তৈরি।
    `.trim();

    fs.mkdirSync(path.dirname(knowledgeFile), { recursive: true });
    fs.writeFileSync(knowledgeFile, sampleKnowledge, 'utf-8');
    console.log('✅ Sample knowledge.txt created');
  }

  // ✅ FIX: Load knowledge and split into chunks
  const rawText = fs.readFileSync(knowledgeFile, 'utf-8');
  knowledgeChunks = rawText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 10); // filter empty/short lines

  if (knowledgeChunks.length === 0) {
    throw new Error('Knowledge file is empty. Please add content to data/knowledge.txt');
  }

  isInitialized = true;
  console.log(`✅ Loaded ${knowledgeChunks.length} knowledge chunks`);
}

/**
 * Simple keyword-based retrieval (no vector DB needed for small knowledge bases)
 */
function retrieveRelevantChunks(query: string, topK = 3): string[] {
  const queryWords = query.toLowerCase().split(/\s+/);

  const scored = knowledgeChunks.map(chunk => {
    const chunkLower = chunk.toLowerCase();
    const score = queryWords.filter(word => chunkLower.includes(word)).length;
    return { chunk, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(item => item.chunk);
}

/**
 * ✅ FIX: Answer questions using RAG with proper initialization check
 */
export async function answerWithRAG(userMessage: string): Promise<string> {
  // ✅ FIX: Check initialization before answering
  if (!isInitialized || knowledgeChunks.length === 0) {
    console.error('RAG service not initialized or no knowledge chunks available.');
    return 'দুঃখিত, এই মুহূর্তে আমাদের সিস্টেমে একটু সমস্যা হচ্ছে। অনুগ্রহ করে কিছুক্ষণ পরে আবার চেষ্টা করুন, অথবা সরাসরি আমাদের নম্বরে যোগাযোগ করুন।';
  }

  try {
    const relevantChunks = retrieveRelevantChunks(userMessage);
    const context = relevantChunks.join('\n');

    const prompt = `তুমি "ঘরের খাবার" ফুড ডেলিভারি সার্ভিসের একটি সহায়ক চ্যাটবট।
নিচের তথ্যের উপর ভিত্তি করে প্রশ্নের উত্তর দাও। যদি তথ্য না থাকে, বিনয়ের সাথে জানাও।

তথ্য:
${context}

গ্রাহকের প্রশ্ন: ${userMessage}

উত্তর (বাংলায় এবং সংক্ষেপে):`;

    const result = await ai.models.generateContent({
      model: 'gemini-1.5-flash-latest',
      contents: prompt,
    });

    return result.text || 'দুঃখিত, উত্তর তৈরি করতে পারিনি।';
  } catch (error) {
    console.error('Gemini API error:', error);
    return 'দুঃখিত, এই মুহূর্তে উত্তর দিতে পারছি না। অনুগ্রহ করে পরে আবার চেষ্টা করুন।';
  }
}
