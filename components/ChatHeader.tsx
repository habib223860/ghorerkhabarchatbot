
import React from 'react';
import { BotIcon } from './icons';

const ChatHeader: React.FC = () => {
  return (
    <div className="bg-white p-4 border-b border-gray-200 flex items-center shadow-sm">
      <BotIcon />
      <div className="ml-4">
        <h1 className="text-lg font-bold text-gray-800">ঘরের খাবার</h1>
        <p className="text-sm text-green-500">Active now</p>
      </div>
    </div>
  );
};

export default ChatHeader;
