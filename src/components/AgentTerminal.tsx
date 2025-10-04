import React, { useState, useRef, useEffect } from 'react';
import { TerminalMessage } from '../types';
import MessageBubble from './MessageBubble';

interface AgentTerminalProps {
  messages: TerminalMessage[];
  onSendMessage: (message: string) => void;
  isProcessing: boolean;
  onStartAgent: () => void;
}

const AgentTerminal: React.FC<AgentTerminalProps> = ({
  messages,
  onSendMessage,
  isProcessing,
  onStartAgent
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
    <div className="flex flex-col h-full bg-[#1a1d23]">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 bg-[#16181d] border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
          </div>
          <h3 className="text-sm font-semibold text-gray-300 font-mono">
            AI VALUATION TERMINAL
          </h3>
          <div className={`text-xs px-2 py-0.5 rounded-full font-mono ${
            isProcessing
              ? 'bg-yellow-500/20 text-yellow-400 animate-pulse'
              : 'bg-emerald-500/20 text-emerald-400'
          }`}>
            {isProcessing ? '🟡 PROCESSING' : '🟢 READY'}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`text-xs px-2 py-1 rounded font-mono transition-colors ${
              autoScroll
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
            title={autoScroll ? 'Auto-scroll enabled' : 'Auto-scroll disabled'}
          >
            {autoScroll ? '📌 LOCKED' : '📌 UNLOCKED'}
          </button>
          <button
            onClick={onStartAgent}
            disabled={isProcessing || messages.length > 0}
            className={`px-3 py-1 text-sm rounded font-medium transition-colors ${
              isProcessing || messages.length > 0
                ? 'bg-gray-700 cursor-not-allowed text-gray-500'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isProcessing ? '🤖 THINKING...' : '🤖 START AGENT'}
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-2"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.02) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px'
        }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-6xl mb-4">🤖</div>
            <h3 className="text-xl font-semibold text-gray-400 mb-2">
              AI Valuation Agent Ready
            </h3>
            <p className="text-sm text-gray-500 max-w-md">
              Click <span className="text-blue-400 font-mono">START AGENT</span> to begin a conversational valuation analysis.
              The agent will guide you through the process and execute calculations in real-time.
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 p-4 bg-[#16181d] border-t border-gray-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message to the agent..."
            disabled={isProcessing}
            className="flex-1 px-4 py-2 bg-[#1a1d23] border border-gray-700 rounded text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed font-medium text-sm"
          >
            {isProcessing ? 'WAIT...' : 'SEND'}
          </button>
        </div>
        <div className="mt-2 text-xs text-gray-600 font-mono">
          Press <kbd className="px-1 py-0.5 bg-gray-800 rounded text-gray-400">Enter</kbd> to send •{' '}
          <kbd className="px-1 py-0.5 bg-gray-800 rounded text-gray-400">Shift + Enter</kbd> for new line
        </div>
      </div>
    </div>
  );
};

export default AgentTerminal;
