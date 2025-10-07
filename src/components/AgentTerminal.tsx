import React, { useState, useRef, useEffect } from 'react';
import { TerminalMessage } from '../types';
import MessageBubble from './MessageBubble';

interface AgentTerminalProps {
  messages: TerminalMessage[];
  onSendMessage: (message: string) => void;
  isProcessing: boolean;
  onStartAgent: () => void;
  onSaveValuation?: (value: number) => void;
}

const AgentTerminal: React.FC<AgentTerminalProps> = ({
  messages,
  onSendMessage,
  isProcessing,
  onStartAgent,
  onSaveValuation
}) => {
  const [input, setInput] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, autoScroll]);

  // Detect manual scroll to disable auto-scroll
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 10;
      setAutoScroll(isAtBottom);
    }
  };

  const handleSend = () => {
    if (!input.trim() || isProcessing) return;
    onSendMessage(input.trim());
    setInput('');
    // Re-enable auto-scroll when user sends a message
    setAutoScroll(true);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            AI Valuation Assistant
          </h3>
          <div className={`text-xs px-2 py-0.5 rounded ${
            isProcessing
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-200 text-gray-600'
          }`}>
            {isProcessing ? 'Processing...' : 'Ready'}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              autoScroll
                ? 'bg-gray-200 text-gray-700'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
            title={autoScroll ? 'Auto-scroll enabled' : 'Auto-scroll disabled'}
          >
            {autoScroll ? 'Auto-scroll' : 'Manual scroll'}
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <h3 className="text-base font-medium text-gray-500 mb-2">
              AI Valuation Assistant
            </h3>
            <p className="text-sm text-gray-400 max-w-md">
              Type a message below to begin a conversational valuation analysis.
              The assistant will guide you through the process and execute calculations.
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} onSaveValuation={onSaveValuation} />
            ))}
            {isProcessing && (
              <div className="flex items-center gap-2 text-gray-500 text-sm py-2">
                <span>Assistant is thinking</span>
                <div className="flex gap-1">
                  <span className="animate-pulse" style={{ animationDelay: '0ms' }}>.</span>
                  <span className="animate-pulse" style={{ animationDelay: '200ms' }}>.</span>
                  <span className="animate-pulse" style={{ animationDelay: '400ms' }}>.</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 p-3 bg-white border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={isProcessing}
            className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentTerminal;
