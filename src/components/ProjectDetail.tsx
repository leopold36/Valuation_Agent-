import React, { useState, useEffect, useRef } from 'react';
import { Project, ValuationMethod, ValuationResult, TerminalMessage, AgentMessage } from '../types';
import AgentTerminal from './AgentTerminal';

interface ProjectDetailProps {
  project: Project;
  onBack: () => void;
}

const ProjectDetail: React.FC<ProjectDetailProps> = ({ project, onBack }) => {
  const [methods, setMethods] = useState<ValuationMethod[]>([]);
  const [messages, setMessages] = useState<TerminalMessage[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<ValuationResult | null>(null);

  // Split pane resize state
  const [leftWidth, setLeftWidth] = useState(50); // percentage
  const [isResizing, setIsResizing] = useState(false);

  // Track unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // MGX Weighted Valuation (calculated in real-time)
  const [mgxValuation, setMgxValuation] = useState<number | null>(null);

  // DCF Form State
  const [cashFlows, setCashFlows] = useState<string>('100, 110, 121, 133, 146');
  const [discountRate, setDiscountRate] = useState<string>('0.10');
  const [terminalValue, setTerminalValue] = useState<string>('1500');
  const [dcfWeight, setDcfWeight] = useState<string>('0.6');

  // Comps Form State
  const [metric, setMetric] = useState<string>('Revenue');
  const [multiple, setMultiple] = useState<string>('5.0');
  const [companyValue, setCompanyValue] = useState<string>('100000000');
  const [compsWeight, setCompsWeight] = useState<string>('0.4');

  useEffect(() => {
    loadMethods();
    loadConversationHistory();
  }, [project.id]);

  // Calculate MGX weighted valuation in real-time
  useEffect(() => {
    const dcfMethod = methods.find(m => m.method_type === 'DCF');
    const compsMethod = methods.find(m => m.method_type === 'Comps');

    const dcfValue = dcfMethod?.calculated_value || 0;
    const compsValue = compsMethod?.calculated_value || 0;
    const dcfW = parseFloat(dcfWeight) || 0;
    const compsW = parseFloat(compsWeight) || 0;

    // Only calculate if we have at least one calculated value
    if (dcfValue > 0 || compsValue > 0) {
      const weighted = (dcfValue * dcfW) + (compsValue * compsW);
      setMgxValuation(weighted);
    } else {
      setMgxValuation(null);
    }
  }, [methods, dcfWeight, compsWeight]);

  const loadConversationHistory = async () => {
    try {
      // Check if there's an active thread for this project
      const activeThread = await window.electronAPI.threads.getActiveThread(project.id);

      if (activeThread) {
        console.log('Loading conversation history from thread:', activeThread.id);

        // Load messages from the thread
        const dbMessages = await window.electronAPI.threads.getMessages(activeThread.id);

        // Convert database messages to TerminalMessage format
        const terminalMessages: TerminalMessage[] = dbMessages.map((msg: any) => ({
          id: msg.id.toString(),
          type: msg.type,
          content: msg.content,
          timestamp: new Date(msg.created_at),
          metadata: msg.metadata
            ? (typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : msg.metadata)
            : undefined
        }));

        setMessages(terminalMessages);
        console.log(`Loaded ${terminalMessages.length} messages from conversation history`);
      } else {
        console.log('No active thread found for project', project.id);
      }
    } catch (error) {
      console.error('Failed to load conversation history:', error);
    }
  };

  const loadMethods = async () => {
    try {
      const loadedMethods = await window.electronAPI.methods.getByProject(project.id);
      setMethods(loadedMethods);

      // If no methods exist, this is a new project with unsaved data
      if (loadedMethods.length === 0) {
        setHasUnsavedChanges(true);
      } else {
        // Project has saved data, mark as saved
        setHasUnsavedChanges(false);
      }

      // Load existing data into form fields
      for (const method of loadedMethods) {
        const metrics = await window.electronAPI.metrics.getByMethod(method.id);

        if (method.method_type === 'DCF') {
          setDcfWeight(method.weight.toString());
          metrics.forEach(metric => {
            if (metric.metric_key === 'cashFlows') setCashFlows(metric.metric_value);
            if (metric.metric_key === 'discountRate') setDiscountRate(metric.metric_value);
            if (metric.metric_key === 'terminalValue') setTerminalValue(metric.metric_value);
          });
        } else if (method.method_type === 'Comps') {
          setCompsWeight(method.weight.toString());
          metrics.forEach(metric => {
            if (metric.metric_key === 'metric') setMetric(metric.metric_value);
            if (metric.metric_key === 'multiple') setMultiple(metric.metric_value);
            if (metric.metric_key === 'companyValue') setCompanyValue(metric.metric_value);
          });
        }
      }
    } catch (error) {
      console.error('Failed to load methods:', error);
    }
  };

  const addMessage = (type: TerminalMessage['type'], content: string, metadata?: any) => {
    setMessages(prev => [...prev, {
      id: `${Date.now()}-${Math.random()}`,
      type,
      content,
      timestamp: new Date(),
      metadata
    }]);
  };

  // Handle weight adjustments with automatic balancing
  const handleDcfWeightChange = (delta: number) => {
    const currentDcf = parseFloat(dcfWeight) || 0.6;
    const newDcf = Math.max(0, Math.min(1.0, currentDcf + delta));
    const newComps = 1.0 - newDcf;

    setDcfWeight(newDcf.toFixed(2));
    setCompsWeight(newComps.toFixed(2));
    setHasUnsavedChanges(true);
  };

  const handleCompsWeightChange = (delta: number) => {
    const currentComps = parseFloat(compsWeight) || 0.4;
    const newComps = Math.max(0, Math.min(1.0, currentComps + delta));
    const newDcf = 1.0 - newComps;

    setCompsWeight(newComps.toFixed(2));
    setDcfWeight(newDcf.toFixed(2));
    setHasUnsavedChanges(true);
  };

  const handleSaveValuation = async (valuationValue: number) => {
    try {
      // Reload methods first to get latest state
      const currentMethods = await window.electronAPI.methods.getByProject(project.id);

      // Check if "Valuation Check" method already exists
      let valuationMethod = currentMethods.find(m => m.method_type === 'Valuation Check');

      if (!valuationMethod) {
        // Create new method
        valuationMethod = await window.electronAPI.methods.create(
          project.id,
          'Valuation Check',
          0 // Weight is not used for valuation check
        );
      }

      // Update the calculated value
      await window.electronAPI.methods.update(valuationMethod.id, {
        calculated_value: valuationValue
      });

      // Reload methods to update UI
      await loadMethods();

      // Confirm save to user
      addMessage('assistant_text', `✓ Valuation of $${valuationValue.toLocaleString()} saved as "Valuation Check"`);

      console.log('[ProjectDetail] Valuation saved successfully:', valuationValue);
    } catch (error: any) {
      console.error('Failed to save valuation:', error);
      addMessage('error', `Failed to save valuation: ${error.message}`);
    }
  };

  const saveData = async () => {
    try {
      // Reload methods first to get latest state
      const currentMethods = await window.electronAPI.methods.getByProject(project.id);

      // Save DCF method and metrics
      let dcfMethod = currentMethods.find(m => m.method_type === 'DCF');
      if (!dcfMethod) {
        dcfMethod = await window.electronAPI.methods.create(
          project.id,
          'DCF',
          parseFloat(dcfWeight) || 0.6
        );
      } else {
        await window.electronAPI.methods.update(dcfMethod.id, {
          weight: parseFloat(dcfWeight) || 0.6
        });
      }

      // Delete old DCF metrics and create new ones
      const existingDcfMetrics = await window.electronAPI.metrics.getByMethod(dcfMethod.id);
      for (const metric of existingDcfMetrics) {
        await window.electronAPI.metrics.delete(metric.id);
      }

      const dcfMetrics = [
        { key: 'cashFlows', value: cashFlows, type: 'array' },
        { key: 'discountRate', value: discountRate, type: 'number' },
        { key: 'terminalValue', value: terminalValue, type: 'number' }
      ];
      await window.electronAPI.metrics.createBatch(dcfMethod.id, dcfMetrics);

      // Save Comps method and metrics
      let compsMethod = currentMethods.find(m => m.method_type === 'Comps');
      if (!compsMethod) {
        compsMethod = await window.electronAPI.methods.create(
          project.id,
          'Comps',
          parseFloat(compsWeight) || 0.4
        );
      } else {
        await window.electronAPI.methods.update(compsMethod.id, {
          weight: parseFloat(compsWeight) || 0.4
        });
      }

      // Delete old Comps metrics and create new ones
      const existingCompsMetrics = await window.electronAPI.metrics.getByMethod(compsMethod.id);
      for (const metric of existingCompsMetrics) {
        await window.electronAPI.metrics.delete(metric.id);
      }

      const compsMetrics = [
        { key: 'metric', value: metric, type: 'string' },
        { key: 'multiple', value: multiple, type: 'number' },
        { key: 'companyValue', value: companyValue, type: 'number' }
      ];
      await window.electronAPI.metrics.createBatch(compsMethod.id, compsMetrics);

      await loadMethods();
      setHasUnsavedChanges(false);
      alert('Data saved successfully!');
    } catch (error: any) {
      console.error('Failed to save data:', error);
      alert(`Failed to save data: ${error.message}`);
    }
  };


  const handleRunAgentValuation = async () => {
    setIsExecuting(true);
    // Don't clear messages - they will be loaded from database or preserved

    try {
      const agentResponse = await window.electronAPI.agent.startValuation(project.id);

      if (!agentResponse.success) {
        throw new Error(agentResponse.error);
      }

      processAgentResponse(agentResponse.response);

      // Reload methods to show any calculated values the agent may have saved
      await loadMethods();

    } catch (error: any) {
      addMessage('error', `Agent error: ${error.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;

    // Add user message
    addMessage('user', message);
    setIsExecuting(true);

    try {
      const agentResponse = await window.electronAPI.agent.sendMessage(project.id, message);

      if (!agentResponse.success) {
        throw new Error(agentResponse.error);
      }

      processAgentResponse(agentResponse.response);

      // Reload methods to show any calculated values the agent may have saved
      await loadMethods();

    } catch (error: any) {
      addMessage('error', `Error: ${error.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const processAgentResponse = (response: any) => {
    console.log('[ProjectDetail] Processing agent response:', response);

    if (!response || !response.messages) return;

    // Convert AgentMessage[] to TerminalMessage[]
    const newMessages: TerminalMessage[] = response.messages.map((msg: AgentMessage) => {
      const terminalMsg: TerminalMessage = {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: msg.timestamp || new Date(),
        content: msg.content,
        metadata: msg.metadata,
        type: 'assistant_text' // default
      };

      // Map agent message types to terminal message types
      switch (msg.type) {
        case 'text':
          terminalMsg.type = 'assistant_text';
          break;
        case 'code':
          terminalMsg.type = 'code_block';
          terminalMsg.metadata = {
            ...msg.metadata,
            code: msg.content
          };
          break;
        case 'tool_call':
          terminalMsg.type = 'tool_call_start';
          break;
        case 'executing':
          terminalMsg.type = 'executing';
          break;
        case 'result':
          terminalMsg.type = 'result';
          break;
        case 'thinking':
          terminalMsg.type = 'thinking';
          break;
        case 'valuation_result':
          terminalMsg.type = 'valuation_result';
          // Ensure metadata is preserved (contains valuationValue)
          break;
        default:
          terminalMsg.type = 'assistant_text';
      }

      return terminalMsg;
    });

    setMessages(prev => [...prev, ...newMessages]);
  };

  // Handle resizing
  const handleMouseDown = () => {
    setIsResizing(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return;

    const container = document.querySelector('.split-container') as HTMLElement;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

    // Constrain between 30% and 70%
    const constrainedWidth = Math.min(Math.max(newWidth, 30), 70);
    setLeftWidth(constrainedWidth);
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove as any);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove as any);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing]);

  return (
    <div className="flex-1 flex overflow-hidden min-h-0 split-container">
      {/* LEFT: Forms */}
      <div
        className="p-3 overflow-y-auto bg-white border-r border-gray-200"
        style={{ width: `${leftWidth}%` }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Valuation Methods</h2>
          <button
            onClick={saveData}
            disabled={!hasUnsavedChanges}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              hasUnsavedChanges
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            {hasUnsavedChanges ? 'Save Data' : 'Saved ✓'}
          </button>
        </div>

          {/* MGX Weighted Valuation Summary */}
          {mgxValuation !== null && (
            <div className="mb-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg">
              <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">
                MGX Valuation
              </div>
              <div className="text-2xl font-bold text-blue-900 mb-2">
                ${mgxValuation.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
              <div className="text-xs text-gray-600">
                {methods.find(m => m.method_type === 'DCF')?.calculated_value && (
                  <span>
                    DCF: ${methods.find(m => m.method_type === 'DCF')?.calculated_value?.toLocaleString()} × {(parseFloat(dcfWeight) * 100).toFixed(0)}%
                  </span>
                )}
                {methods.find(m => m.method_type === 'DCF')?.calculated_value && methods.find(m => m.method_type === 'Comps')?.calculated_value && (
                  <span className="mx-1">+</span>
                )}
                {methods.find(m => m.method_type === 'Comps')?.calculated_value && (
                  <span>
                    Comps: ${methods.find(m => m.method_type === 'Comps')?.calculated_value?.toLocaleString()} × {(parseFloat(compsWeight) * 100).toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
          )}

          {/* DCF Form */}
          <div className="mb-3 p-2.5 border border-gray-200 rounded">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">DCF</h3>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">Weight:</span>
                  <span className="text-xs font-medium text-gray-900">
                    {(parseFloat(dcfWeight) * 100).toFixed(0)}%
                  </span>
                  <div className="flex flex-col">
                    <button
                      onClick={() => handleDcfWeightChange(0.05)}
                      className="px-1 py-0 text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors leading-none"
                      title="Increase by 5%"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => handleDcfWeightChange(-0.05)}
                      className="px-1 py-0 text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors leading-none"
                      title="Decrease by 5%"
                    >
                      ▼
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-0.5">
                  Cash Flows
                </label>
                <input
                  type="text"
                  value={cashFlows}
                  onChange={(e) => { setCashFlows(e.target.value); setHasUnsavedChanges(true); }}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="100, 110, 121, 133, 146"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-0.5">
                  Discount Rate
                </label>
                <input
                  type="text"
                  value={discountRate}
                  onChange={(e) => { setDiscountRate(e.target.value); setHasUnsavedChanges(true); }}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="0.10"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-0.5">
                  Terminal Value
                </label>
                <input
                  type="text"
                  value={terminalValue}
                  onChange={(e) => { setTerminalValue(e.target.value); setHasUnsavedChanges(true); }}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="1500"
                />
              </div>

              {/* Calculated Valuation Display */}
              {methods.find(m => m.method_type === 'DCF')?.calculated_value && (
                <div className="pt-2 border-t border-gray-200">
                  <label className="block text-xs font-medium text-green-700 mb-0.5">
                    Calculated Valuation
                  </label>
                  <div className="text-lg font-bold text-green-600">
                    ${methods.find(m => m.method_type === 'DCF')?.calculated_value?.toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Comps Form */}
          <div className="mb-3 p-2.5 border border-gray-200 rounded">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Comparables</h3>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">Weight:</span>
                  <span className="text-xs font-medium text-gray-900">
                    {(parseFloat(compsWeight) * 100).toFixed(0)}%
                  </span>
                  <div className="flex flex-col">
                    <button
                      onClick={() => handleCompsWeightChange(0.05)}
                      className="px-1 py-0 text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors leading-none"
                      title="Increase by 5%"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => handleCompsWeightChange(-0.05)}
                      className="px-1 py-0 text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors leading-none"
                      title="Decrease by 5%"
                    >
                      ▼
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">
                    Metric
                  </label>
                  <select
                    value={metric}
                    onChange={(e) => { setMetric(e.target.value); setHasUnsavedChanges(true); }}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Revenue">Revenue</option>
                    <option value="EBITDA">EBITDA</option>
                    <option value="Earnings">Earnings</option>
                    <option value="Book Value">Book Value</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">
                    Multiple
                  </label>
                  <input
                    type="text"
                    value={multiple}
                    onChange={(e) => { setMultiple(e.target.value); setHasUnsavedChanges(true); }}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="5.0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-0.5">
                  Company {metric}
                </label>
                <input
                  type="text"
                  value={companyValue}
                  onChange={(e) => { setCompanyValue(e.target.value); setHasUnsavedChanges(true); }}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="100000000"
                />
              </div>

              {/* Calculated Valuation Display */}
              {methods.find(m => m.method_type === 'Comps')?.calculated_value && (
                <div className="pt-2 border-t border-gray-200">
                  <label className="block text-xs font-medium text-green-700 mb-0.5">
                    Calculated Valuation
                  </label>
                  <div className="text-lg font-bold text-green-600">
                    ${methods.find(m => m.method_type === 'Comps')?.calculated_value?.toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Valuation Check - Display Only */}
          {methods.find(m => m.method_type === 'Valuation Check') && (
            <div className="p-2.5 border-2 border-green-300 bg-green-50 rounded">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-green-800 uppercase tracking-wide">Valuation Check</h3>
                <span className="text-xs text-green-600">AI Result</span>
              </div>
              <div className="text-2xl font-bold text-green-900">
                ${methods.find(m => m.method_type === 'Valuation Check')?.calculated_value?.toLocaleString() || 'N/A'}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                Saved from AI Valuation Assistant
              </div>
            </div>
          )}
        </div>

      {/* DIVIDER */}
      <div
        className={`w-1 bg-gray-200 hover:bg-blue-500 cursor-col-resize transition-colors ${
          isResizing ? 'bg-blue-500' : ''
        }`}
        onMouseDown={handleMouseDown}
        style={{ flexShrink: 0 }}
      />

      {/* RIGHT: Unified Agent Terminal */}
      <div
        className="flex-1"
        style={{ width: `${100 - leftWidth}%` }}
      >
        <AgentTerminal
          messages={messages}
          onSendMessage={handleSendMessage}
          isProcessing={isExecuting}
          onStartAgent={handleRunAgentValuation}
          onSaveValuation={handleSaveValuation}
        />
      </div>
    </div>
  );
};

export default ProjectDetail;
