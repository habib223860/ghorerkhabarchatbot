import { Request, Response } from 'express';
import { answerWithRAG } from '../services/ragService.js';
import { sendMessage, sendTypingOn } from '../services/messengerService.js';

const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || 'my_verify_token';

/**
 * ✅ Handle Facebook webhook verification (GET request)
 */
export function verifyWebhook(req: Request, res: Response): void {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Webhook verified');
    res.status(200).send(challenge);
  } else {
    console.error('❌ Webhook verification failed. Check VERIFY_TOKEN.');
    res.sendStatus(403);
  }
}

/**
 * ✅ Handle incoming Messenger messages (POST request)
 */
export async function handleMessengerWebhook(req: Request, res: Response): Promise<void> {
  // Always respond 200 immediately so Facebook doesn't retry
  res.sendStatus(200);

  const body = req.body;

  if (body.object !== 'page') return;

  for (const entry of body.entry || []) {
    for (const event of entry.messaging || []) {
      const senderId: string = event?.sender?.id;

      // ✅ FIX: Skip if no valid sender ID
      if (!senderId) {
        console.warn('⚠️  Received event with no sender ID, skipping.');
        continue;
      }

      // Handle text messages only
      if (event.message?.text) {
        const userMessage: string = event.message.text;
        console.log(`📨 Message from ${senderId}: "${userMessage}"`);

        try {
          // Show typing indicator
          await sendTypingOn(senderId);

          // Get RAG answer
          const reply = await answerWithRAG(userMessage);

          // Send reply
          await sendMessage(senderId, reply);
        } catch (error) {
          console.error(`❌ Error handling message from ${senderId}:`, error);
          await sendMessage(senderId, 'দুঃখিত, একটু সমস্যা হয়েছে। আবার চেষ্টা করুন।');
        }
      } else if (event.postback) {
        // Handle button postbacks
        const payload = event.postback.payload;
        console.log(`📲 Postback from ${senderId}: ${payload}`);
        await sendMessage(senderId, 'আপনার বার্তা পেয়েছি। কীভাবে সাহায্য করতে পারি?');
      }
    }
  }
}
