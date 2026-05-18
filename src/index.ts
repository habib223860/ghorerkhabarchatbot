import express, { Request, Response } from 'express';
import { handleMessengerWebhook, verifyWebhook } from './webhookHandler.js';
import { initializeRAG } from '../services/ragService.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ✅ FIX: Initialize RAG on startup with error handling
async function startServer() {
  try {
    console.log('🚀 Initializing RAG service...');
    await initializeRAG();
    console.log('✅ RAG service initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize RAG service:', error);
    // Don't crash — bot will use fallback responses
  }

  // Webhook verification (GET)
  app.get('/webhook', verifyWebhook);

  // Webhook messages (POST)
  app.post('/webhook', handleMessengerWebhook);

  // Health check
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
  });
}

startServer();
