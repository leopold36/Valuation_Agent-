import React from 'react';
import ReactMarkdown from 'react-markdown';
import { TerminalMessage } from '../types';
import CodeBlock from './CodeBlock';
import ExecutionStatus, { ExecutionState } from './ExecutionStatus';

interface MessageBubbleProps {
  message: TerminalMessage;
  onSaveValuation?: (value: number) => void;
  onSaveMethodValuation?: (methodType: string, value: number) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onSaveValuation, onSaveMethodValuation }) => {
  const [dismissed, setDismissed] = React.useState(false);
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
          <div className="flex items-start gap-2">
            <div className="flex-shrink-0 text-xs font-medium text-gray-500 w-16 pt-1">
              User
            </div>
            <div className="flex-1">
              <div className="px-3 py-2 rounded border border-gray-300 bg-white">
                <div className="text-sm text-gray-900">{message.content}</div>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {formatTime(message.timestamp)}
              </div>
            </div>
          </div>
        );

      case 'assistant_text':
        return (
          <div className="flex items-start gap-2">
            <div className="flex-shrink-0 text-xs font-medium text-gray-500 w-16 pt-1">
              Assistant
            </div>
            <div className="flex-1">
              <div className="px-3 py-2 rounded border border-gray-200 bg-white">
                <div className="text-sm prose prose-sm max-w-none text-gray-800">
                  <ReactMarkdown
                    components={{
                      p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc list-inside mb-2 space-y-1" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-2 space-y-1" {...props} />,
                      li: ({node, ...props}) => <li className="ml-2" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-semibold text-gray-900" {...props} />,
                      em: ({node, ...props}) => <em className="italic text-gray-700" {...props} />,
                      code: ({node, ...props}) => <code className="bg-gray-100 px-1.5 py-0.5 rounded text-blue-700 font-mono text-xs" {...props} />,
                      h1: ({node, ...props}) => <h1 className="text-base font-semibold mb-2 text-gray-900" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-sm font-semibold mb-2 text-gray-900" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-sm font-medium mb-1 text-gray-800" {...props} />,
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {formatTime(message.timestamp)}
              </div>
            </div>
          </div>
        );

      case 'thinking':
        return (
          <div className="flex items-start gap-2">
            <div className="flex-shrink-0 text-xs font-medium text-gray-500 w-16 pt-1">
              System
            </div>
            <div className="flex-1">
              <ExecutionStatus state="thinking" message={message.content} />
              <div className="text-xs text-gray-400 mt-1">
                {formatTime(message.timestamp)}
              </div>
            </div>
          </div>
        );

      case 'tool_call_start':
        return (
          <div className="flex items-start gap-2">
            <div className="flex-shrink-0 text-xs font-medium text-gray-500 w-16 pt-1">
              System
            </div>
            <div className="flex-1">
              <div className="px-3 py-2 rounded border-l-4 border-blue-500 bg-blue-50">
                <div className="text-xs font-medium text-blue-700 mb-1">
                  Tool Call: {message.metadata?.tool || 'Unknown'}
                </div>
                {message.content && (
                  <div className="text-sm text-gray-700">
                    {message.content}
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {formatTime(message.timestamp)}
              </div>
            </div>
          </div>
        );

      case 'code_block':
        return (
          <div className="flex items-start gap-2">
            <div className="flex-shrink-0 text-xs font-medium text-gray-500 w-16 pt-1">
              Code
            </div>
            <div className="flex-1">
              <CodeBlock
                code={message.metadata?.code || message.content}
                language={message.metadata?.language || 'python'}
                executionTime={message.metadata?.executionTime}
              />
              <div className="text-xs text-gray-400 mt-1">
                {formatTime(message.timestamp)}
              </div>
            </div>
          </div>
        );

      case 'executing':
        return (
          <div className="flex items-start gap-2">
            <div className="flex-shrink-0 text-xs font-medium text-gray-500 w-16 pt-1">
              System
            </div>
            <div className="flex-1">
              <ExecutionStatus
                state="executing"
                message={message.content}
                duration={message.metadata?.executionTime}
              />
              <div className="text-xs text-gray-400 mt-1">
                {formatTime(message.timestamp)}
              </div>
            </div>
          </div>
        );

      case 'result':
        const isSuccess = message.metadata?.success !== false;
        return (
          <div className="flex items-start gap-2">
            <div className="flex-shrink-0 text-xs font-medium text-gray-500 w-16 pt-1">
              Result
            </div>
            <div className="flex-1">
              <div className={`px-3 py-2 rounded border-l-4 ${
                isSuccess
                  ? 'border-green-500 bg-green-50'
                  : 'border-red-500 bg-red-50'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-medium ${isSuccess ? 'text-green-700' : 'text-red-700'}`}>
                    {isSuccess ? 'Success' : 'Error'}
                  </span>
                  {message.metadata?.executionTime !== undefined && (
                    <span className="text-xs text-gray-500">
                      ({message.metadata.executionTime.toFixed(2)}s)
                    </span>
                  )}
                </div>
                <div className={`text-sm font-mono ${isSuccess ? 'text-green-800' : 'text-red-800'}`}>
                  <pre className="whitespace-pre-wrap">{message.content}</pre>
                </div>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {formatTime(message.timestamp)}
              </div>
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="flex items-start gap-2">
            <div className="flex-shrink-0 text-xs font-medium text-gray-500 w-16 pt-1">
              Error
            </div>
            <div className="flex-1">
              <div className="px-3 py-2 rounded border-l-4 border-red-500 bg-red-50">
                <div className="text-xs font-medium text-red-700 mb-1">
                  Error
                </div>
                <div className="text-sm text-red-800">
                  {message.content}
                </div>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {formatTime(message.timestamp)}
              </div>
            </div>
          </div>
        );

      case 'method_valuation_result':
        if (dismissed) return null;

        const methodValue = message.metadata?.valuationValue;
        const methodType = message.metadata?.methodType || 'Method';
        return (
          <div className="flex items-start gap-2">
            <div className="flex-shrink-0 text-xs font-medium text-gray-500 w-16 pt-1">
              Result
            </div>
            <div className="flex-1">
              <div className="px-4 py-3 rounded-lg border-2 border-blue-500 bg-blue-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold text-blue-800">
                    ✓ {methodType} Valuation Complete
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatTime(message.timestamp)}
                  </div>
                </div>

                <div className="text-2xl font-bold text-blue-900 mb-3">
                  ${methodValue?.toLocaleString() || 'N/A'}
                </div>

                <div className="text-sm text-gray-700 mb-3">
                  {message.content}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (onSaveMethodValuation && methodValue && methodType) {
                        onSaveMethodValuation(methodType, methodValue);
                        setDismissed(true);
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
                  >
                    Save to Database
                  </button>
                  <button
                    onClick={() => setDismissed(true)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded hover:bg-gray-300 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'valuation_result':
        if (dismissed) return null;

        const valuationValue = message.metadata?.valuationValue;
        return (
          <div className="flex items-start gap-2">
            <div className="flex-shrink-0 text-xs font-medium text-gray-500 w-16 pt-1">
              Result
            </div>
            <div className="flex-1">
              <div className="px-4 py-3 rounded-lg border-2 border-green-500 bg-green-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold text-green-800">
                    ✓ Valuation Complete
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatTime(message.timestamp)}
                  </div>
                </div>

                <div className="text-2xl font-bold text-green-900 mb-3">
                  ${valuationValue?.toLocaleString() || 'N/A'}
                </div>

                <div className="text-sm text-gray-700 mb-3">
                  {message.content}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (onSaveValuation && valuationValue) {
                        onSaveValuation(valuationValue);
                        setDismissed(true);
                      }
                    }}
                    className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 transition-colors"
                  >
                    Save to Database
                  </button>
                  <button
                    onClick={() => setDismissed(true)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded hover:bg-gray-300 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="flex items-start gap-2">
            <div className="flex-shrink-0 text-xs font-medium text-gray-500 w-16 pt-1">
              System
            </div>
            <div className="flex-1">
              <div className="px-3 py-2 rounded border border-gray-200 bg-white">
                <div className="text-sm text-gray-700">{message.content}</div>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {formatTime(message.timestamp)}
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="message-bubble max-w-4xl">
      {renderContent()}
    </div>
  );
};

export default MessageBubble;
