import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'next-i18next';
import { Socket } from 'socket.io-client';
import { MessageSquare } from 'lucide-react';
import { Message } from '@/lib/types';
import { ColorArr } from '@/lib/constants';
import useMediaQuery from '@/hooks/useMediaQuery';

const ChatBoxMessage = ({ message }: { message: Message }) => {
  return (
    <div className='leading-6'>
      {message.player ? (
        <span
          className='font-black'
          style={{
            color: ColorArr[message.player.color],
          }}
        >
          {message.player.username}
        </span>
      ) : (
        <span className='font-black uppercase tracking-[0.16em] text-zinc-500'>
          [system]
        </span>
      )}
      <span className='ml-2 text-zinc-100'>{message.content}</span>
      {message.target && (
        <>
          <span className='mx-1 text-zinc-500'>→</span>
          <span
            className='font-black'
            style={{
              color: ColorArr[message.target.color],
            }}
          >
            {message.target.username}
          </span>
        </>
      )}
    </div>
  );
};

interface ChatBoxProp {
  socket: Socket | null;
  messages: Message[];
}

export default React.memo(function ChatBox({ socket, messages }: ChatBoxProp) {
  const [inputValue, setInputValue] = useState('');
  const [isExpand, setIsExpand] = useState(false);
  const textFieldRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const isSmallScreen = useMediaQuery('(max-width:600px)');

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({});
  }, [messages, isExpand]);

  useEffect(() => {
    setIsExpand(!isSmallScreen);
  }, [isSmallScreen]);

  const { t } = useTranslation();

  const handleInputKeyDown = (event: any) => {
    if (event.key === 'Enter') {
      handleSendMessage();
    }
  };

  const handleGlobalKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && textFieldRef.current) {
      event.preventDefault();
      textFieldRef.current.focus();
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  const handleInputChange = (event: any) => {
    setInputValue(event.target.value);
  };

  const handleSendMessage = () => {
    if (inputValue.trim() !== '') {
      setInputValue('');
      if (socket) socket.emit('player_message', inputValue);
    }
  };

  const dockLayoutClass = isSmallScreen
    ? `bottom-3 left-3 right-3 w-auto ${isExpand ? 'h-[42dvh]' : 'h-14'}`
    : `bottom-0 right-0 ${
        isExpand ? 'h-[40vh] w-[350px]' : 'h-[11vh] w-[300px]'
      }`;

  const dockBorderClass = isSmallScreen ? 'border' : 'border-l border-t';

  if (isSmallScreen && !isExpand) {
    return (
      <button
        type='button'
        className='bw-side-dock fixed bottom-3 right-3 z-[1001] inline-flex min-h-14 items-center gap-2 border px-3 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500 transition-all duration-200 hover:text-zinc-200'
        onClick={() => setIsExpand(true)}
        aria-label='Open chat'
      >
        <MessageSquare size={16} strokeWidth={2.25} />
        Chat
      </button>
    );
  }

  return (
    <section
      className={`bw-side-dock fixed z-[1003] flex ${dockLayoutClass} flex-col ${dockBorderClass} transition-all duration-200 ${isExpand ? 'opacity-100' : 'z-[1001] opacity-80'}`}
      onClick={() => {
        if (!isExpand) setIsExpand(true);
      }}
    >
      <div
        className='flex items-center justify-between gap-3 border-b border-zinc-800 px-3 py-2 sm:px-4'
        onClick={() => {
          if (isExpand) setIsExpand(false);
        }}
      >
        <span className='truncate text-[11px] font-black uppercase tracking-[0.22em] text-zinc-500'>
          Tactical Feed
        </span>
        <span className='shrink-0 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-600'>
          Enter
        </span>
      </div>
      <div
        className='flex-1 overflow-y-auto px-4 py-3 text-sm'
        onClick={() => {
          if (isExpand) setIsExpand(false);
        }}
      >
        {messages.map((message, index) => (
          <ChatBoxMessage key={index} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </div>
      {socket && (
        <div className='border-t border-zinc-800 p-2'>
          <input
            className='bw-input h-10 px-3 text-left text-sm'
            placeholder={t('type-a-message')}
            value={inputValue}
            onChange={handleInputChange}
            ref={textFieldRef}
            onKeyDown={handleInputKeyDown}
          />
        </div>
      )}
    </section>
  );
});
