import Groq from 'groq-sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ✅ Gemini এর বদলে Groq
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

let knowledgeChunks: string[] = [];
let isInitialized = false;

export async function initializeRAG(): Promise<void> {
  const knowledgeFile = path.join(__dirname, '../data/knowledge.txt');

  if (!fs.existsSync(knowledgeFile)) {
    console.warn('⚠️  knowledge.txt not found. Creating sample file...');
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

  const rawText = fs.readFileSync(knowledgeFile, 'utf-8');
  knowledgeChunks = rawText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 10);

  if (knowledgeChunks.length === 0) {
    throw new Error('Knowledge file is empty!');
  }

  isInitialized = true;
  console.log(`✅ Loaded ${knowledgeChunks.length} knowledge chunks`);
}

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

export async function answerWithRAG(userMessage: string): Promise<string> {
  if (!isInitialized || knowledgeChunks.length === 0) {
    return 'দুঃখিত, সিস্টেমে সমস্যা হচ্ছে। একটু পরে আবার চেষ্টা করুন।';
  }

  try {
    const relevantChunks = retrieveRelevantChunks(userMessage);
    const context = relevantChunks.join('\n');

    // ✅ Groq API call
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile', // ✅ সেরা ফ্রি model
      messages: [
        {
          role: 'system',
          content: `তুমি "ঘরের খাবার" ফুড ডেলিভারি সার্ভিসের একটি সহায়ক চ্যাটবট।
নিচের তথ্যের উপর ভিত্তি করে প্রশ্নের উত্তর দাও। যদি তথ্য না থাকে, বিনয়ের সাথে জানাও।

তথ্য:
${context}`
        },
        {
          role: 'user',
          content: userMessage
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    return completion.choices[0]?.message?.content || 'দুঃখিত, উত্তর তৈরি করতে পারিনি।';

  } catch (error) {
    console.error('Groq API error:', error);
    return 'দুঃখিত, এই মুহূর্তে উত্তর দিতে পারছি না। অনুগ্রহ করে পরে আবার চেষ্টা করুন।';
  }
}
