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
আসসালামু আলাইকুম 
আমাদের কাছে আপনারা পাচ্ছেন 
১) চিকেন রোল ১৫ পিসের প্যাক    ২২৫ টাকা
২) ভেজিটেবল রোল ১৫ পিসের প্যাক ১৫০ টাকা
৩) বিফ রোল ১০ পিসের প্যাক ২৫০ টাকা 
৪) চিকেন সমুচা ১৫ পিসের প্যাক ২২৫ টাকা 
৫) ভেজিটেবল সমুচা ১৫ পিসের প্যাক ১৫০ টাকা 
৬) বিফ সমুচা ১০ পিসের প্যাক ২৫০ টাকা 
৭) চিকেন সিঙ্গারা ১০ পিসের  প্যাক ১৫০ টাকা 
৮) আলু সিঙ্গারা ১০ পিসের প্যাক ১০০ টাকা 
৯) চিকেন কলিজা সিঙ্গারা ১০ পিসের প্যাক ১৬০ টাকা ।
১০) আলু পুরি  ২০ পিসের প্যাক ১৬০ টাকা 
১১) ডাল পুরি ২০ পিসের প্যাক ১৬০ টাকা 
১২) চিকেন নাগেটস ১২ পিসের প্যাক ২৪০ টাকা 
১৩) চিকেন টিকিয়া কাবাব ১২ পিসের প্যাক ২৪০ টাকা
১৪) চিকেন ঝাল ডোনাট  ১২ পিসের প্যাক ২৪০ টাকা
১৫) চিকেন কাটলেট ১২ পিসের প্যাক ২৪০ টাকা । 
১৬) চারকোনা পরোটা  
      ক)২০ পিসের প্যাক(১২০০gm )220টাকা ।
      খ)২০ পিসের প্যাক (১৫০০ gm) 260টাকা।
      গ) ১০ পিস আলু পরোটা ২৫০ টাকা

১৭) আটা রুটি ২০ পিসের প্যাক ১৬০ টাকা 
১৮) ময়দা রুটি ২০ পিসের প্যাক ১৮০ টাকা 
১৯) লাল আটা রুটি  ২০ পিসের প্যাক ১৮০ টাকা 
২০) চাউলের রুটি ২০ পিসের প্যাক 200 টাকা 
২১) পাটি সাপটা ১০ পিসের প্যাক ২০০ টাকা
২২) অন্থন ১০ পিসের প্যাক ১৫০ টাকা 
২৩) সুজির হালুয়া ৪০০ টাকা কেজি 
২৪) গাজরের হালুয়া ৮০০ টাকা কেজি 
২৫) বুটের হালুয়া ৭০০ টাকা কেজি 
(বি: দ্রঃ কমপক্ষে যে কোন ২ প্যাক অর্ডার করতে হবে)
ডেলিভারি এরিয়া 
মিরপুর, উত্তরা, বসুন্ধরা, গুলশান, তেজগাঁও, বনশ্রী , রামপুরা, ধানমন্ডি, মোহাম্মদপুর, আজিমপুর, পল্টন, মালিবাগ,
অর্ডার কনফার্ম করতে,
পণ্যের নামঃ
আপনার নামঃ
ঠিকানাঃ
মোবাইল নাম্বারঃ
দিয়ে সহযোগিতা করুন।
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

function retrieveRelevantChunks(query: string, topK = 15): string[] {
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
          content: `তুমি "ঘরের খাবার" হোমমেড ফুড ডেলিভারি সার্ভিসের চ্যাটবট।
সব প্রশ্নের উত্তর বাংলায় দাও।
যদি কেউ মেনু বা সব আইটেম জানতে চায়, সব items এর নাম ও দাম বলো।
যদি নির্দিষ্ট item জানতে চায়, শুধু সেটার তথ্য দাও।

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
