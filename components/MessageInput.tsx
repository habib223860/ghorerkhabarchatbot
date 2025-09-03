
import React, { useState } from 'react';
import { SendIcon, ThumbsUpIcon } from './icons';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, isLoading }) => {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const handleThumbsUp = () => {
    if (!isLoading) {
      onSendMessage('👍');
    }
  };

  return (
    <div className="bg-white p-4 border-t border-gray-200">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Aa"
          className="flex-grow bg-gray-100 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          disabled={isLoading}
        />
        {inputValue ? (
          <button
            type="submit"
            className="text-blue-500 p-2 rounded-full hover:bg-blue-100 disabled:text-gray-400 disabled:hover:bg-transparent"
            disabled={isLoading}
          >
            <SendIcon />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleThumbsUp}
            className="text-blue-500 p-2 rounded-full hover:bg-blue-100 disabled:text-gray-400 disabled:hover:bg-transparent"
            disabled={isLoading}
          >
            <ThumbsUpIcon />
          </button>
        )}
      </form>
    </div>
  );
};

export default MessageInput;
