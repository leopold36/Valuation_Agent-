import React from 'react';
import ReactMarkdown from 'react-markdown';
import { TerminalMessage } from '../types';
import CodeBlock from './CodeBlock';
import ExecutionStatus, { ExecutionState } from './ExecutionStatus';

interface MessageBubbleProps {
  message: TerminalMessage;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  const renderContent = () => {
    switch (message.type) {
      case 'user':
        return (
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm">
              👤
            </div>
            <div className="flex-1">
              <div className="inline-block px-4 py-2 rounded-lg bg-blue-600 text-white max-w-[80%]">
                <div className="text-sm">{message.content}</div>
              </div>
              <div className="text-xs text-gray-500 mt-1 font-mono">
                {formatTime(message.timestamp)}
              </div>
            </div>
          </div>
        );

      case 'assistant_text':
        return (
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-sm">
              🤖
            </div>
            <div className="flex-1">
              <div className="inline-block px-4 py-2 rounded-lg bg-gray-800 text-gray-100 max-w-[90%] border border-gray-700">
                <div className="text-sm prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown
                    components={{
                      p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc list-inside mb-2 space-y-1" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-2 space-y-1" {...props} />,
                      li: ({node, ...props}) => <li className="ml-2" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-bold text-emerald-300" {...props} />,
                      em: ({node, ...props}) => <em className="italic text-gray-300" {...props} />,
                      code: ({node, ...props}) => <code className="bg-gray-900 px-1.5 py-0.5 rounded text-blue-300 font-mono text-xs" {...props} />,
                      h1: ({node, ...props}) => <h1 className="text-lg font-bold mb-2 text-emerald-400" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-base font-bold mb-2 text-emerald-400" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-sm font-bold mb-1 text-emerald-400" {...props} />,
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-1 font-mono">
                {formatTime(message.timestamp)}
              </div>
            </div>
          </div>
        );

      case 'thinking':
        return (
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center text-white text-sm">
              🤔
            </div>
            <div className="flex-1">
              <ExecutionStatus state="thinking" message={message.content} />
              <div className="text-xs text-gray-500 mt-1 font-mono">
                {formatTime(message.timestamp)}
              </div>
            </div>
          </div>
        );

      case 'tool_call_start':
        return (
          <div className="my-3 border-l-4 border-amber-500 pl-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-amber-400 text-sm">⚙️</span>
              <span className="text-sm font-semibold text-amber-400 uppercase tracking-wide">
                Tool Call: {message.metadata?.tool || 'Unknown'}
              </span>
              <span className="text-xs text-gray-500 font-mono">
                {formatTime(message.timestamp)}
              </span>
            </div>
            {message.content && (
              <div className="text-sm text-gray-400 mt-1">
                {message.content}
              </div>
            )}
          </div>
        );

      case 'code_block':
        return (
          <div className="my-2">
            <div className="text-xs text-blue-400 mb-1 flex items-center gap-2">
              <span>📝</span>
              <span className="font-mono">{formatTime(message.timestamp)}</span>
            </div>
            <CodeBlock
              code={message.metadata?.code || message.content}
              language={message.metadata?.language || 'python'}
              executionTime={message.metadata?.executionTime}
            />
          </div>
        );

      case 'executing':
        return (
          <div className="flex items-start gap-3 my-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-600 flex items-center justify-center text-white text-sm animate-pulse">
              ⚡
            </div>
            <div className="flex-1">
              <ExecutionStatus
                state="executing"
                message={message.content}
                duration={message.metadata?.executionTime}
              />
              <div className="text-xs text-gray-500 mt-1 font-mono">
                {formatTime(message.timestamp)}
              </div>
            </div>
          </div>
        );

      case 'result':
        const isSuccess = message.metadata?.success !== false;
        return (
          <div className={`my-3 border-l-4 ${isSuccess ? 'border-emerald-500' : 'border-red-500'} pl-4`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-sm ${isSuccess ? 'text-emerald-400' : 'text-red-400'}`}>
                {isSuccess ? '✅' : '❌'}
              </span>
              <span className={`text-sm font-semibold ${isSuccess ? 'text-emerald-400' : 'text-red-400'} uppercase tracking-wide`}>
                {isSuccess ? 'Result' : 'Error'}
              </span>
              {message.metadata?.executionTime !== undefined && (
                <span className="text-xs text-gray-500">
                  ({message.metadata.executionTime.toFixed(2)}s)
                </span>
              )}
              <span className="text-xs text-gray-500 font-mono">
                {formatTime(message.timestamp)}
              </span>
            </div>
            <div className={`text-sm font-mono px-3 py-2 rounded ${
              isSuccess
                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                : 'bg-red-500/10 text-red-300 border border-red-500/30'
            }`}>
              <pre className="whitespace-pre-wrap">{message.content}</pre>
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="my-3 border-l-4 border-red-500 pl-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-red-400 text-sm">❌</span>
              <span className="text-sm font-semibold text-red-400 uppercase tracking-wide">
                Error
              </span>
              <span className="text-xs text-gray-500 font-mono">
                {formatTime(message.timestamp)}
              </span>
            </div>
            <div className="text-sm text-red-300 bg-red-500/10 px-3 py-2 rounded border border-red-500/30">
              {message.content}
            </div>
          </div>
        );

      default:
        return (
          <div className="text-sm text-gray-400">
            {message.content}
          </div>
        );
    }
  };

  return (
    <div className="message-bubble">
      {renderContent()}
    </div>
  );
};

export default MessageBubble;
