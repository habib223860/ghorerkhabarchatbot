/**
 * ✅ FIX: Facebook Messenger API service with proper error handling
 * and user ID validation to prevent "#100 No matching user found" errors
 */

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || '';
const MESSENGER_API = 'https://graph.facebook.com/v19.0/me/messages';

/**
 * ✅ FIX: Validate sender ID before sending to avoid error #100
 * PSIDs must be non-empty strings of digits
 */
function isValidSenderId(senderId: string): boolean {
  if (!senderId || typeof senderId !== 'string') return false;
  if (!/^\d+$/.test(senderId.trim())) return false;
  if (senderId.length < 5) return false; // PSIDs are always long digit strings
  return true;
}

/**
 * ✅ FIX: Send message with full error handling and logging
 */
export async function sendMessage(recipientId: string, text: string): Promise<void> {
  // ✅ FIX: Validate recipient ID before making API call
  if (!isValidSenderId(recipientId)) {
    console.error(`❌ Invalid recipient ID: "${recipientId}". Skipping send.`);
    return;
  }

  if (!PAGE_ACCESS_TOKEN) {
    console.error('❌ PAGE_ACCESS_TOKEN is not set in environment variables');
    return;
  }

  const body = {
    recipient: { id: recipientId },
    message: { text },
    messaging_type: 'RESPONSE',
  };

  try {
    const response = await fetch(`${MESSENGER_API}?access_token=${PAGE_ACCESS_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json() as any;

    if (!response.ok || data.error) {
      // ✅ FIX: Detailed error logging instead of crashing
      const errCode = data?.error?.code;
      const errMsg = data?.error?.message;

      if (errCode === 100 && data?.error?.error_subcode === 2018001) {
        console.error(`❌ Messenger Error: User "${recipientId}" not found on this page. `
          + `This usually means:\n`
          + `  1. The PSID belongs to a different Facebook Page\n`
          + `  2. The user has blocked your page\n`
          + `  3. You're using a test/invalid user ID\n`
          + `  4. The PAGE_ACCESS_TOKEN doesn't match the page`);
      } else if (errCode === 190) {
        console.error('❌ Messenger Error: PAGE_ACCESS_TOKEN is expired or invalid. Please refresh it.');
      } else {
        console.error(`❌ Failed to send message to Messenger:`, JSON.stringify(data, null, 2));
      }
    } else {
      console.log(`✅ Message sent to ${recipientId}: "${text.substring(0, 50)}..."`);
    }
  } catch (error) {
    console.error('❌ Network error sending to Messenger:', error);
  }
}

/**
 * Send typing indicator to show bot is processing
 */
export async function sendTypingOn(recipientId: string): Promise<void> {
  if (!isValidSenderId(recipientId)) return;

  await fetch(`${MESSENGER_API}?access_token=${PAGE_ACCESS_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: recipientId },
      sender_action: 'typing_on',
    }),
  }).catch(() => {}); // Silently ignore typing indicator failures
}
