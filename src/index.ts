/// <reference types="node" />
import express from 'express';
import bodyParser from 'body-parser';
import { GoogleGenAI, Chat } from "@google/genai";

// ---- Configuration ----
const FB_VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN;
const FB_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const API_KEY = process.env.API_KEY;

if (!FB_VERIFY_TOKEN || !FB_PAGE_ACCESS_TOKEN || !API_KEY) {
    console.error("Missing required environment variables. Please ensure FB_VERIFY_TOKEN, FB_PAGE_ACCESS_TOKEN, and API_KEY are set.");
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: API_KEY });
const systemInstruction = `
আপনি 'ঘরের খাবার' নামের একটি হোমমেড ফ্রোজেন ফুড ব্যবসার জন্য একজন বন্ধুত্বপূর্ণ এবং সহায়ক সহকারী। আপনার নাম নীলা। 
গ্রাহকদের সাথে সবসময় বাংলায় সালাম দিয়ে কথা বলবেন। আপনার প্রধান কাজ হলো গ্রাহকদের সব প্রশ্নের উত্তর দেওয়া, তাদের পণ্য সম্পর্কে জানানো এবং অর্ডার করতে সাহায্য করা। একই কথা বারবার না বলাই ভালো।
আপনার আচরণ হবে খুবই আন্তরিক এবং সহযোগিতাপূর্ণ। কাস্টমারের সাথে সবসময় বিনয়ের সাথে to the point কথা বলবেন।

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

ডেলিভারি চার্জ ঢাকার ভিতরে ৬০ টাকা, এবং ঢাকা সিটির বাইরে কোন ডেলিভারি হয় না । অর্ডার করার জন্য গ্রাহকের নাম, ঠিকানা, এবং ফোন নম্বর প্রয়োজন হবে।
`;

const chatSessions = new Map<string, Chat>();

function getOrCreateChat(sessionId: string): Chat {
    if (chatSessions.has(sessionId)) {
        return chatSessions.get(sessionId)!;
    }

    console.log(`Creating new chat session for user: ${sessionId}`);
    const newChat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: systemInstruction,
        },
    });
    chatSessions.set(sessionId, newChat);
    return newChat;
}

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});

app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === FB_VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
});

app.post('/webhook', (req, res) => {
    const body = req.body;

    if (body.object === 'page') {
        body.entry.forEach((entry: any) => {
            const webhookEvent = entry.messaging[0];
            const senderPsid = webhookEvent.sender.id;
            
            if (webhookEvent.message && webhookEvent.message.text) {
                handleMessage(senderPsid, webhookEvent.message.text);
            }
        });
        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});

async function handleMessage(senderPsid: string, receivedMessage: string) {
    try {
        const chat = getOrCreateChat(senderPsid);
        const response = await chat.sendMessage({ message: receivedMessage });
        const geminiText = response.text || "দুঃখিত, আমি ঠিক বুঝতে পারিনি।";
        
        await callSendAPI(senderPsid, geminiText);
    } catch (error) {
        console.error('Error handling message:', error);
        await callSendAPI(senderPsid, "দুঃখিত, একটি সমস্যা হয়েছে। আমরা বিষয়টি দেখছি।");
    }
}

async function callSendAPI(senderPsid: string, responseText: string) {
    const requestBody = {
        "recipient": { "id": senderPsid },
        "message": { "text": responseText },
        "messaging_type": "RESPONSE"
    };

    const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${FB_PAGE_ACCESS_TOKEN}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        if (!response.ok) {
            const data = await response.json();
            console.error("Failed to send message to Messenger:", JSON.stringify(data, null, 2));
        } else {
            console.log("Message sent successfully!");
        }
    } catch (error) {
        console.error("Unable to send message via fetch:", error);
    }
}