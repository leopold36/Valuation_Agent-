import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBlockProps {
  code: string;
  language?: string;
  executionTime?: number;
  showCopy?: boolean;
}

const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language = 'python',
  executionTime,
  showCopy = true
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-2">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1e1e1e] border border-gray-700 rounded-t">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-gray-400 uppercase tracking-wide">
            {language}
          </span>
          {executionTime !== undefined && (
            <span className="text-xs text-emerald-400 flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {executionTime.toFixed(2)}s
            </span>
          )}
        </div>

        {showCopy && (
          <button
            onClick={handleCopy}
            className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors opacity-0 group-hover:opacity-100"
            title="Copy code"
          >
            {copied ? '✓ Copied' : '📋 Copy'}
          </button>
        )}
      </div>

      {/* Code */}
      <div className="border border-t-0 border-gray-700 rounded-b overflow-hidden">
        <SyntaxHighlighter
          language={language}
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            borderRadius: 0,
            fontSize: '13px',
            padding: '16px',
            background: '#1a1d23',
          }}
          codeTagProps={{
            style: {
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
              lineHeight: '1.6',
            }
          }}
          showLineNumbers={code.split('\n').length > 5}
          lineNumberStyle={{
            minWidth: '3em',
            paddingRight: '1em',
            color: '#6e7681',
            userSelect: 'none'
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

export default CodeBlock;
