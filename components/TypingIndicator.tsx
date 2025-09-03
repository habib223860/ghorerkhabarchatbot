
import React from 'react';
import { BotIcon } from './icons';

const TypingIndicator: React.FC = () => {
  return (
    <div className="flex items-end gap-2 my-2 justify-start">
      <div className="self-start">
          <BotIcon />
      </div>
      <div className="bg-gray-200 text-gray-800 rounded-2xl rounded-bl-none px-4 py-3 flex items-center">
        <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-0"></span>
        <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-150 mx-1"></span>
        <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-300"></span>
      </div>
    </div>
  );
};

export default TypingIndicator;
