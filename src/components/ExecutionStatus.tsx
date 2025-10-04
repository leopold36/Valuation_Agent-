import React from 'react';

export type ExecutionState = 'thinking' | 'writing_code' | 'executing' | 'complete' | 'error';

interface ExecutionStatusProps {
  state: ExecutionState;
  message?: string;
  duration?: number;
}

const ExecutionStatus: React.FC<ExecutionStatusProps> = ({ state, message, duration }) => {
  const getStatusConfig = () => {
    switch (state) {
      case 'thinking':
        return {
          icon: '🤔',
          color: 'text-amber-400',
          bgColor: 'bg-amber-500/10',
          borderColor: 'border-amber-500/30',
          label: 'Thinking',
          animated: true
        };
      case 'writing_code':
        return {
          icon: '📝',
          color: 'text-blue-400',
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-500/30',
          label: 'Writing Code',
          animated: true
        };
      case 'executing':
        return {
          icon: '⚡',
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/30',
          label: 'Executing',
          animated: true
        };
      case 'complete':
        return {
          icon: '✅',
          color: 'text-emerald-400',
          bgColor: 'bg-emerald-500/10',
          borderColor: 'border-emerald-500/30',
          label: 'Complete',
          animated: false
        };
      case 'error':
        return {
          icon: '❌',
          color: 'text-red-400',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/30',
          label: 'Error',
          animated: false
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded border ${config.bgColor} ${config.borderColor}`}>
      <span className={`text-sm ${config.animated ? 'animate-pulse' : ''}`}>
        {config.icon}
      </span>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-medium ${config.color} uppercase tracking-wide`}>
          {config.label}
        </span>
        {message && (
          <span className="text-xs text-gray-400">
            {message}
          </span>
        )}
        {duration !== undefined && (
          <span className="text-xs text-gray-500">
            ({duration.toFixed(2)}s)
          </span>
        )}
      </div>
      {config.animated && (
        <div className="flex gap-0.5">
          <div className={`w-1 h-1 rounded-full ${config.color} animate-bounce`} style={{ animationDelay: '0ms' }}></div>
          <div className={`w-1 h-1 rounded-full ${config.color} animate-bounce`} style={{ animationDelay: '150ms' }}></div>
          <div className={`w-1 h-1 rounded-full ${config.color} animate-bounce`} style={{ animationDelay: '300ms' }}></div>
        </div>
      )}
    </div>
  );
};

export default ExecutionStatus;
