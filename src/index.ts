
/// <reference types="node" />
// FIX: Changed express.json() usage to resolve TypeScript overload ambiguity.
import express from 'express';
import { initializeRag, answerQuestion } from './ragService.js';

// ---- Configuration ----
const FB_VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN;
const FB_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;

if (!FB_VERIFY_TOKEN || !FB_PAGE_ACCESS_TOKEN || !process.env.API_KEY) {
    const missingVars = [
        !process.env.API_KEY && "API_KEY",
        !FB_VERIFY_TOKEN && "FB_VERIFY_TOKEN",
        !FB_PAGE_ACCESS_TOKEN && "FB_PAGE_ACCESS_TOKEN"
    ].filter(Boolean).join(", ");
    console.error(`Missing required environment variables: ${missingVars}.`);
    throw new Error("Missing required environment variables. Halting server startup.");
}

// ---- Express Server Setup ----
const app = express();
// FIX: Using express.json() from the default export to avoid type overloads.
app.use(express.json());

// ---- Server Startup ----
async function startServer() {
    // Initialize the RAG service before the server starts listening for requests
    await initializeRag();

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server is listening on port ${PORT}`);
    });
}

// ---- Webhook Endpoints ----
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === FB_VERIFY_TOKEN) {
        console.log('WEBHOOK_VERIFIED');
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
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

// ---- Helper Functions ----
async function handleMessage(senderPsid: string, receivedMessage: string) {
    try {
        let botResponse = await answerQuestion(receivedMessage);

        const orderConfirmedMarker = '[ORDER_CONFIRMED]';
        if (botResponse.includes(orderConfirmedMarker)) {
            console.log(`Order confirmed for user ${senderPsid}. Attempting to add label.`);
            botResponse = botResponse.replace(orderConfirmedMarker, '').trim();

            const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
            const labelName = `Order: ${today}`;

            try {
                const labelId = await createOrGetLabelId(labelName);
                if (labelId) {
                    await associateLabelWithUser(senderPsid, labelId);
                    console.log(`Successfully labeled user ${senderPsid} with label "${labelName}"`);
                }
            } catch (labelError) {
                console.error(`Failed to process label for user ${senderPsid}:`, labelError);
            }
        }
        
        await callSendAPI(senderPsid, botResponse);
    } catch (error) {
        console.error('Error in handleMessage:', error);
        await callSendAPI(senderPsid, "দুঃখিত, একটি প্রযুক্তিগত সমস্যা হয়েছে। আমরা এটি দ্রুত সমাধান করার চেষ্টা করছি।");
    }
}

async function callSendAPI(senderPsid: string, responseText: string) {
    if (!responseText || responseText.trim() === "") {
        console.log("Skipping empty response.");
        return;
    }

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

// ---- Facebook Labeling Functions ----
async function createOrGetLabelId(labelName: string): Promise<string | null> {
    const getLabelsUrl = `https://graph.facebook.com/v19.0/me/custom_labels?fields=name&access_token=${FB_PAGE_ACCESS_TOKEN}`;
    
    try {
        const getResponse = await fetch(getLabelsUrl);
        const getResponseData = await getResponse.json();
        if (!getResponse.ok) throw new Error(`Error fetching labels: ${JSON.stringify(getResponseData)}`);

        const existingLabel = getResponseData.data?.find((label: any) => label.name === labelName);
        if (existingLabel) {
            return existingLabel.id;
        }

        const createLabelUrl = `https://graph.facebook.com/v19.0/me/custom_labels?name=${encodeURIComponent(labelName)}&access_token=${FB_PAGE_ACCESS_TOKEN}`;
        const createResponse = await fetch(createLabelUrl, { method: 'POST' });
        const createResponseData = await createResponse.json();

        if (!createResponse.ok) throw new Error(`Error creating label: ${JSON.stringify(createResponseData)}`);
        
        return createResponseData.id;
    } catch (error) {
        console.error("Exception in createOrGetLabelId:", error);
        return null;
    }
}

async function associateLabelWithUser(psid: string, labelId: string): Promise<void> {
    const associateUrl = `https://graph.facebook.com/v19.0/${labelId}/label?user=${psid}&access_token=${FB_PAGE_ACCESS_TOKEN}`;
    
    try {
        const response = await fetch(associateUrl, { method: 'POST' });
        const responseData = await response.json();
        if (!response.ok || !responseData.success) {
            throw new Error(`Error associating label: ${JSON.stringify(responseData)}`);
        }
    } catch (error) {
        console.error(`Exception in associateLabelWithUser for user ${psid}:`, error);
    }
}

// Start the server
startServer();