import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Chat } from '@google/genai';
import { Message } from './types';
import { initializeChat } from './services/geminiService';
import ChatHeader from './components/ChatHeader';
import MessageBubble from './components/MessageBubble';
import TypingIndicator from './components/TypingIndicator';
import MessageInput from './components/MessageInput';

const App: React.FC = () => {
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const chatSession = initializeChat();
        setChat(chatSession);

        const welcomeMessage: Message = {
          id: Date.now().toString(),
          text: 'আসসালামু আলাইকুম! ‘ঘরের খাবার’-এ আপনাকে স্বাগতম। আমি নীলা, আপনার যেকোনো প্রয়োজনে সহায়তা করতে প্রস্তুত।',
          sender: 'bot',
        };
        setMessages([welcomeMessage]);
      } catch (e) {
        setError('Failed to initialize chat session. Please check your API key.');
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSendMessage = useCallback(async (text: string) => {
    if (!chat) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text,
      sender: 'user',
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    const botMessageId = `bot-${Date.now()}`;
    const initialBotMessage: Message = {
        id: botMessageId,
        text: '',
        sender: 'bot'
    };
    setMessages(prev => [...prev, initialBotMessage]);

    try {
        const stream = await chat.sendMessageStream({ message: text });
        let fullResponse = "";
        for await (const chunk of stream) {
            fullResponse += chunk.text;
            setMessages(prev => prev.map(msg => 
                msg.id === botMessageId ? { ...msg, text: fullResponse } : msg
            ));
        }
    } catch (e: any) {
        const errorMessage = "দুঃখিত, এই মুহূর্তে আমি উত্তর দিতে পারছি না। কিছুক্ষণ পর আবার চেষ্টা করুন।";
        setMessages(prev => prev.map(msg => 
            msg.id === botMessageId ? { ...msg, text: errorMessage } : msg
        ));
        setError("An error occurred while fetching the response.");
        console.error(e);
    } finally {
        setIsLoading(false);
    }
  }, [chat]);

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100 font-sans">
      <div className="w-full max-w-lg h-full sm:h-[90vh] sm:max-h-[700px] flex flex-col bg-white shadow-2xl rounded-lg overflow-hidden">
        <ChatHeader />
        <div ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto bg-gray-50">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {isLoading && messages.length > 0 && <TypingIndicator />}
          {error && <div className="text-red-500 text-center my-2">{error}</div>}
        </div>
        {/* FIX: The isLoading prop should be passed directly to disable the input while the bot is responding. */}
        <MessageInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default App;
