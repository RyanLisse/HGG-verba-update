'use client';

import { AnimatePresence, motion } from 'framer-motion';
import type React from 'react';
import { useEffect, useState } from 'react';
import { BiSolidErrorCircle, BiSolidMessageAltDetail } from 'react-icons/bi';
import { FaWandMagicSparkles } from 'react-icons/fa6';
import { IoWarning } from 'react-icons/io5';
import type { StatusMessage } from '@/app/types';

type StatusMessengerProps = {
  status_messages: StatusMessage[];
  set_status_messages: (messages: StatusMessage[]) => void;
};

const StatusMessengerComponent: React.FC<StatusMessengerProps> = ({
  status_messages,
  set_status_messages,
}) => {
  const [messages, setMessages] = useState<StatusMessage[]>([]);

  useEffect(() => {
    if (status_messages.length > 0) {
      // Add new messages to the state
      setMessages((prevMessages) => [...prevMessages, ...status_messages]);

      // Clear the status_messages
      set_status_messages([]);
    }

    // Clear messages older than 5 seconds
    const interval = setInterval(() => {
      const currentTime = Date.now();
      setMessages((prevMessages) =>
        prevMessages.filter((message) => {
          const messageTime = new Date(message.timestamp).getTime();
          return currentTime - messageTime < 5000;
        })
      );
    }, 1000); // Check every second

    return () => clearInterval(interval);
  }, [status_messages, set_status_messages]);

  const getMessageColor = (type: string) => {
    switch (type) {
      case 'INFO':
        return 'bg-button-verba';
      case 'WARNING':
        return 'bg-secondary-verba';
      case 'SUCCESS':
        return 'bg-primary-verba';
      case 'ERROR':
        return 'bg-warning-verba';
      default:
        return 'bg-button-verba';
    }
  };

  const getMessageIcon = (type: string) => {
    const icon_size = 15;

    switch (type) {
      case 'INFO':
        return <BiSolidMessageAltDetail size={icon_size} />;
      case 'WARNING':
        return <IoWarning size={icon_size} />;
      case 'SUCCESS':
        return <FaWandMagicSparkles size={icon_size} />;
      case 'ERROR':
        return <BiSolidErrorCircle size={icon_size} />;
      default:
        return <BiSolidMessageAltDetail size={icon_size} />;
    }
  };

  return (
    <div className="fixed right-4 bottom-4 z-50 space-y-2">
      <AnimatePresence>
        {messages
          .filter((message) => {
            const messageTime = new Date(message.timestamp).getTime();
            const currentTime = Date.now();
            return currentTime - messageTime < 5000; // 5 seconds in milliseconds
          })
          .map((message, index) => (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className={`${getMessageColor(message.type)} z-10 min-w-[300px] rounded-lg p-4 text-text-verba shadow-md`}
              exit={{ opacity: 0, y: 50 }}
              initial={{ opacity: 0, y: 50 }}
              key={index}
            >
              <div className="flex flex-col gap-2">
                <div className="flex flex-row items-center gap-2">
                  {getMessageIcon(message.type)}
                  <p className="font-bold text-xs">{message.type}</p>
                </div>
                <p className="text-base">{message.message}</p>
              </div>
            </motion.div>
          ))}
      </AnimatePresence>
    </div>
  );
};

export default StatusMessengerComponent;
