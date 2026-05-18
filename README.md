# ঘরের খাবার চ্যাটবট 🍱

A RAG-based Facebook Messenger chatbot for the "Ghorer Khabar" home food delivery service.

## Fixed Issues ✅

### 1. RAG service not initialized
**Root cause:** `initializeRAG()` was not being awaited before the server started handling requests, OR the knowledge file was missing.

**Fix applied:**
- Server now awaits `initializeRAG()` before starting
- Auto-creates `data/knowledge.txt` if missing
- Gracefully handles initialization failures (bot still runs with a fallback message)

### 2. Messenger `#100 No matching user found` (error_subcode: 2018001)
**Root cause:** The `recipient.id` (PSID) being used doesn't match the Facebook Page connected to the `PAGE_ACCESS_TOKEN`.

**Fix applied:**
- Added PSID validation before every API call
- Detailed error logging explains exactly what went wrong
- Common causes now clearly logged:
  - PSID belongs to a different Facebook page
  - User has blocked the page
  - Using test/fake user IDs
  - Token mismatch

---

## Quick Setup

### 1. Clone and Install
```bash
git clone https://github.com/habib223860/ghorerkhabarchatbot
cd ghorerkhabarchatbot
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

Edit `.env` with your real values:
```env
GEMINI_API_KEY=your_gemini_api_key
PAGE_ACCESS_TOKEN=your_facebook_page_token
VERIFY_TOKEN=ghorer_khabar_bot_2024
```

### 3. Add Your Knowledge Base
Edit `data/knowledge.txt` — add one fact per line about your business:
```
আমাদের ডেলিভারি সময় সকাল ৮টা থেকে রাত ১০টা।
মূল্য তালিকা: ভাত প্যাকেজ ৮০ টাকা...
```

### 4. Run
```bash
npm run dev        # Development
npm run build && npm start  # Production
```

---

## Project Structure

```
ghorerkhabarchatbot/
├── src/
│   ├── index.ts           # Server entry point
│   └── webhookHandler.ts  # Facebook webhook handler
├── services/
│   ├── ragService.ts      # RAG knowledge retrieval + Gemini
│   └── messengerService.ts # Facebook Messenger API calls
├── data/
│   └── knowledge.txt      # Your business knowledge base
├── .env.example           # Environment variable template
└── package.json
```

---

## Fixing the `#100` Messenger Error

If you still see `No matching user found`, check these in order:

**Step 1 — Token matches page?**
The `PAGE_ACCESS_TOKEN` must come from the **exact same page** that users message.
- Go to [Facebook Developer Console](https://developers.facebook.com)
- App → Messenger → Settings → Access Tokens
- Generate token for YOUR page, not a test page

**Step 2 — Is the PSID valid?**
Log the raw sender ID from incoming webhook:
```typescript
console.log('Sender ID:', event.sender.id);
```
It should be a long number like `1234567890123456`. If it's empty or looks wrong, the webhook payload is malformed.

**Step 3 — Did the user message your page first?**
Facebook only allows messaging users who have messaged your page within the last 24h (standard messaging), or who have opted in. You cannot proactively message arbitrary users.

**Step 4 — Check token expiry**
Page Access Tokens can expire. Use [Token Debugger](https://developers.facebook.com/tools/debug/accesstoken/) to verify.

---

## Environment Variables

| Variable | Description | Where to get it |
|---|---|---|
| `GEMINI_API_KEY` | Google Gemini API key | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `PAGE_ACCESS_TOKEN` | Facebook Page token | FB Developer Console |
| `VERIFY_TOKEN` | Webhook verification token | Set by you (any string) |
| `PORT` | Server port | Default: 3000 |

---

## Adding More Knowledge

Edit `data/knowledge.txt` — each line is a knowledge chunk:
```
আমাদের বিশেষ রমজান প্যাকেজ: ইফতার বক্স ২৫০ টাকা।
অফিস লাঞ্চের জন্য ১০+ অর্ডারে ১৫% ছাড়।
নতুন আইটেম: বিরিয়ানি প্যাকেজ ২২০ টাকা।
```

No restart needed if using the file-based approach — restart server after edits.
