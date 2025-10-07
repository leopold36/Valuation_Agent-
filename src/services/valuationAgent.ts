/**
 * Valuation Agent - Claude Agent SDK Implementation
 *
 * Uses Claude Agent SDK with built-in code execution.
 * No external services (Modal, etc.) needed.
 */

import { query } from '@anthropic-ai/claude-agent-sdk';

interface ProjectData {
  id: number;
  name: string;
  description?: string;
  investment_type?: string;
  status?: string;
  methods?: any[];
  [key: string]: any;
}

interface AgentMessage {
  type: 'text' | 'code' | 'result' | 'thinking' | 'tool_call' | 'executing' | 'valuation_result' | 'method_valuation_result';
  content: string;
  metadata?: any;
  timestamp?: Date;
}

interface AgentResponse {
  messages: AgentMessage[];
  done: boolean;
  finalValuation?: any;
}

class ValuationAgentService {
  private conversations: Map<number, { history: string[]; projectData: ProjectData; threadId?: number }>;
  private database: any;

  constructor() {
    this.conversations = new Map();
    this.database = null;

    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('[ValuationAgent] ANTHROPIC_API_KEY not found in environment');
    }
  }

  /**
   * Set database instance (called from main.js)
   */
  setDatabase(db: any) {
    this.database = db;
  }

  /**
   * Persist message to database
   */
  private persistMessage(threadId: number | undefined, type: string, content: string, metadata: any = null) {
    if (this.database && threadId) {
      try {
        this.database.createMessage(threadId, type, content, metadata);
      } catch (error) {
        console.error('[ValuationAgent] Failed to persist message:', error);
      }
    }
  }

  /**
   * Restore conversation from database
   */
  async restoreConversation(projectId: number, projectData: ProjectData): Promise<{ threadId: number; history: string[] } | null> {
    if (!this.database) return null;

    try {
      // Check if there's an active thread for this project
      const activeThread = this.database.getActiveThreadByProject(projectId);
      if (!activeThread) {
        console.log(`[ValuationAgent] No active thread found for project ${projectId}`);
        return null;
      }

      console.log(`[ValuationAgent] Found active thread ${activeThread.id} for project ${projectId}`);

      // Load messages from the thread
      const messages = this.database.getMessagesByThread(activeThread.id);

      // Rebuild conversation history from messages
      const history: string[] = [];
      for (const msg of messages) {
        // Only include user and assistant_text messages in history
        if (msg.type === 'user') {
          history.push(`User: ${msg.content}`);
        } else if (msg.type === 'assistant_text') {
          history.push(`Assistant: ${msg.content}`);
        }
      }

      console.log(`[ValuationAgent] Restored ${messages.length} messages (${history.length} in history) from thread ${activeThread.id}`);

      return {
        threadId: activeThread.id,
        history
      };
    } catch (error) {
      console.error('[ValuationAgent] Failed to restore conversation:', error);
      return null;
    }
  }

  /**
   * Start a new valuation conversation for a project
   */
  async startValuation(projectId: number, projectData: ProjectData): Promise<AgentResponse> {
    console.log(`[ValuationAgent] Starting valuation for project ${projectId}`);

    // Check if conversation already exists in memory
    let conversation = this.conversations.get(projectId);

    if (conversation) {
      console.log(`[ValuationAgent] Conversation already exists in memory for project ${projectId}`);
      // Return empty response - conversation already active
      return {
        messages: [],
        done: true
      };
    }

    // Try to restore from database
    const restored = await this.restoreConversation(projectId, projectData);

    if (restored) {
      // Conversation exists in database, restore it
      conversation = {
        history: restored.history,
        projectData,
        threadId: restored.threadId
      };
      this.conversations.set(projectId, conversation);

      console.log(`[ValuationAgent] Restored existing conversation for project ${projectId}`);

      // Return empty response - messages are already loaded in UI from database
      return {
        messages: [],
        done: true
      };
    }

    // No existing conversation, create a new one
    let threadId: number | undefined;
    if (this.database) {
      try {
        const thread = this.database.createThread(projectId, 'New Valuation Session');
        threadId = thread.id;
        console.log(`[ValuationAgent] Created thread ${threadId} for project ${projectId}`);
      } catch (error) {
        console.error('[ValuationAgent] Failed to create thread:', error);
      }
    }

    conversation = {
      history: [],
      projectData,
      threadId
    };
    this.conversations.set(projectId, conversation);

    const systemPrompt = this.buildSystemPrompt(projectData);
    const userMessage = 'Hello! Please introduce yourself and summarize the project data. Then ask if I would like you to proceed with creating a valuation plan.';

    // Call Claude Agent SDK with code execution enabled
    const response = await this.runQuery(systemPrompt, userMessage, projectId);

    return response;
  }

  /**
   * Send a message to an ongoing conversation
   */
  async sendMessage(projectId: number, message: string, projectData?: ProjectData): Promise<AgentResponse> {
    let conversation = this.conversations.get(projectId);

    // If no conversation in memory, try to restore from database
    if (!conversation) {
      console.log(`[ValuationAgent] No conversation in memory for project ${projectId}, attempting to restore...`);

      // If no projectData provided, we can't restore - need it from the caller
      if (!projectData) {
        throw new Error(`No active conversation for project ${projectId} and no project data provided to restore it`);
      }

      const restored = await this.restoreConversation(projectId, projectData);

      if (restored) {
        // Conversation exists in database, restore it to memory
        conversation = {
          history: restored.history,
          projectData,
          threadId: restored.threadId
        };
        this.conversations.set(projectId, conversation);
        console.log(`[ValuationAgent] Successfully restored conversation for project ${projectId}`);
      } else {
        // No conversation in database either, start a new one
        console.log(`[ValuationAgent] No existing conversation found, starting new one for project ${projectId}`);
        await this.startValuation(projectId, projectData);
        conversation = this.conversations.get(projectId);

        if (!conversation) {
          throw new Error(`Failed to initialize conversation for project ${projectId}`);
        }
      }
    }

    console.log(`[ValuationAgent] Sending message to project ${projectId}:`, message);

    // Persist user message to database
    if (this.database && conversation.threadId) {
      try {
        this.database.createMessage(conversation.threadId, 'user', message, null);
      } catch (error) {
        console.error('[ValuationAgent] Failed to persist user message:', error);
      }
    }

    const systemPrompt = this.buildSystemPrompt(conversation.projectData);

    // Add conversation history context
    const fullMessage = conversation.history.length > 0
      ? `Previous conversation:\n${conversation.history.join('\n\n')}\n\nUser: ${message}`
      : message;

    const response = await this.runQuery(systemPrompt, fullMessage, projectId);

    // Store in history
    conversation.history.push(`User: ${message}`);
    if (response.messages.length > 0) {
      const assistantMsg = response.messages.map(m => m.content).join('\n');
      conversation.history.push(`Assistant: ${assistantMsg}`);
    }

    return response;
  }

  /**
   * Run a query using the Claude Agent SDK
   */
  private async runQuery(systemPrompt: string, userMessage: string, projectId: number): Promise<AgentResponse> {
    const messages: AgentMessage[] = [];
    let done = false;
    let finalValuation = null;

    // Get thread ID for persistence
    const conversation = this.conversations.get(projectId);
    const threadId = conversation?.threadId;

    try {
      console.log('[ValuationAgent] Starting query with system prompt length:', systemPrompt.length);
      console.log('[ValuationAgent] User message:', userMessage.substring(0, 100));

      // Use Claude Agent SDK query
      // The SDK will spawn Claude CLI which has all tools including code execution via Bash
      const queryIterator = query({
        prompt: userMessage,
        options: {
          systemPrompt,
          allowedTools: ['Bash', 'Edit', 'Read', 'Write', 'Grep'], // Use actual tool names from Claude CLI
          permissionMode: 'bypassPermissions', // Auto-approve all tool use (valid modes: 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan')
        }
      });

      // Iterate through response stream
      for await (const chunk of queryIterator) {
        console.log('[ValuationAgent] Received chunk type:', (chunk as any).type);

        if (typeof chunk === 'object' && chunk !== null) {
          const chunkType = (chunk as any).type;

          // Handle assistant messages (these contain the actual text response)
          if (chunkType === 'assistant') {
            const message = (chunk as any).message;
            if (message && message.content) {
              // Extract text from content blocks
              for (const block of message.content) {
                if (block.type === 'text') {
                  const msg = {
                    type: 'text',
                    content: block.text,
                    timestamp: new Date()
                  };
                  messages.push(msg);
                  this.persistMessage(threadId, 'assistant_text', block.text);
                  console.log('[ValuationAgent] Added text message:', block.text.substring(0, 100));

                  // Check for method-specific valuations (DCF_VALUE, COMPS_VALUE)
                  const dcfMatch = block.text.match(/DCF[_\s](?:VALUE|VALUATION):\s*\$?([\d,]+)/i);
                  if (dcfMatch) {
                    const dcfValue = parseFloat(dcfMatch[1].replace(/,/g, ''));
                    console.log('[ValuationAgent] Detected DCF valuation:', dcfValue);

                    // Create save prompt message for DCF
                    const dcfMsg: AgentMessage = {
                      type: 'method_valuation_result',
                      content: 'Would you like to save this DCF valuation to the database?',
                      metadata: {
                        valuationValue: dcfValue,
                        methodType: 'DCF'
                      },
                      timestamp: new Date()
                    };
                    messages.push(dcfMsg);
                    this.persistMessage(threadId, 'method_valuation_result', dcfMsg.content, dcfMsg.metadata);
                  }

                  const compsMatch = block.text.match(/COMPS?[_\s](?:VALUE|VALUATION):\s*\$?([\d,]+)/i);
                  if (compsMatch) {
                    const compsValue = parseFloat(compsMatch[1].replace(/,/g, ''));
                    console.log('[ValuationAgent] Detected Comps valuation:', compsValue);

                    // Create save prompt message for Comps
                    const compsMsg: AgentMessage = {
                      type: 'method_valuation_result',
                      content: 'Would you like to save this Comparables valuation to the database?',
                      metadata: {
                        valuationValue: compsValue,
                        methodType: 'Comps'
                      },
                      timestamp: new Date()
                    };
                    messages.push(compsMsg);
                    this.persistMessage(threadId, 'method_valuation_result', compsMsg.content, compsMsg.metadata);
                  }
                } else if (block.type === 'tool_use') {
                  // Agent is using a tool (Bash, Edit, etc.)
                  // Add a "tool call start" message
                  const toolCallMsg = {
                    type: 'tool_call',
                    content: `Using ${block.name} tool`,
                    metadata: { tool: block.name },
                    timestamp: new Date()
                  };
                  messages.push(toolCallMsg);
                  this.persistMessage(threadId, 'tool_call', toolCallMsg.content, toolCallMsg.metadata);

                  // If it's a Bash tool with code, show the code
                  if (block.name === 'Bash' && block.input && typeof block.input === 'object') {
                    const bashInput = block.input as any;
                    if (bashInput.command) {
                      const codeMsg = {
                        type: 'code',
                        content: bashInput.command,
                        metadata: {
                          tool: 'Bash',
                          language: bashInput.command.includes('python') ? 'python' : 'bash'
                        },
                        timestamp: new Date()
                      };
                      messages.push(codeMsg);
                      // THIS IS CRITICAL FOR AUDITING - Persist Python/Bash code
                      this.persistMessage(threadId, 'code_block', codeMsg.content, codeMsg.metadata);
                    }
                  }

                  // Add executing status
                  const execMsg = {
                    type: 'executing',
                    content: `Executing ${block.name}...`,
                    metadata: { tool: block.name },
                    timestamp: new Date()
                  };
                  messages.push(execMsg);
                  this.persistMessage(threadId, 'executing', execMsg.content, execMsg.metadata);
                }
              }
            }
          }

          // Handle results (final completion message)
          else if (chunkType === 'result') {
            const resultText = (chunk as any).result;
            if (resultText && !messages.find(m => m.content === resultText)) {
              // Only add if not already added from assistant message
              messages.push({
                type: 'text',
                content: resultText,
                timestamp: new Date()
              });
            }
            done = true;
          }

          // Handle tool results
          else if (chunkType === 'tool_result') {
            const result = (chunk as any);
            const resultMsg = {
              type: 'result',
              content: result.content || JSON.stringify(chunk, null, 2),
              metadata: {
                success: !result.is_error,
                executionTime: result.duration_ms ? result.duration_ms / 1000 : undefined
              },
              timestamp: new Date()
            };
            messages.push(resultMsg);
            // Persist execution results for audit trail
            this.persistMessage(threadId, 'result', resultMsg.content, resultMsg.metadata);
          }

          // Handle system messages (init, etc.)
          else if (chunkType === 'system') {
            console.log('[ValuationAgent] System message:', (chunk as any).subtype);
          }
        }
      }

      // If no messages were parsed, try to extract text from final result
      if (messages.length === 0) {
        console.log('[ValuationAgent] No messages parsed, using default response');
        messages.push({
          type: 'text',
          content: 'Response received but could not parse message content.',
          timestamp: new Date()
        });
      }

    } catch (error) {
      console.error('[ValuationAgent] Error in query:', error);

      // Extract more detailed error information
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
        if (error.stack) {
          console.error('[ValuationAgent] Error stack:', error.stack);
        }
        // Check if there's additional error info
        if ((error as any).stderr) {
          console.error('[ValuationAgent] Claude CLI stderr:', (error as any).stderr);
          errorMessage += `\nCLI Error: ${(error as any).stderr}`;
        }
      }

      messages.push({
        type: 'text',
        content: `Error: ${errorMessage}\n\nPlease check that Claude Code CLI is properly configured with your API key.`,
        timestamp: new Date()
      });
    }

    return {
      messages,
      done,
      finalValuation
    };
  }

  /**
   * Clear conversation for a project
   */
  clearConversation(projectId: number): void {
    this.conversations.delete(projectId);
    console.log(`[ValuationAgent] Cleared conversation for project ${projectId}`);
  }

  /**
   * Format project data summary for the agent
   */
  private formatProjectDataSummary(projectData: ProjectData): string {
    let summary = `Project: ${projectData.name}\n`;

    if (projectData.description) {
      summary += `Description: ${projectData.description}\n`;
    }

    summary += `\nValuation Methods:\n`;

    if (projectData.methods && projectData.methods.length > 0) {
      for (const method of projectData.methods) {
        summary += `\n- ${method.method_type} (Weight: ${method.weight})\n`;

        if (method.calculated_value) {
          summary += `  Calculated Value: $${method.calculated_value.toLocaleString()}\n`;
        }

        // Get metrics for this method
        const methodMetrics = (projectData as any).metrics?.filter((m: any) => m.method_id === method.id) || [];

        if (methodMetrics.length > 0) {
          summary += `  Metrics:\n`;
          for (const metric of methodMetrics) {
            summary += `    - ${metric.metric_key}: ${metric.metric_value}\n`;
          }
        }
      }
    } else {
      summary += `  No valuation methods configured yet.\n`;
    }

    return summary;
  }

  /**
   * Build system prompt with project context
   */
  private buildSystemPrompt(projectData: ProjectData): string {
    return `You are a friendly and professional financial valuation expert named MGX Valuation Agent. You specialize in enterprise valuations.

**YOUR EXPERTISE:**
- Discounted Cash Flow (DCF) analysis
- Comparable Company Analysis (Trading Multiples)
- Precedent Transaction Analysis
- Asset-Based Valuation

**IMPORTANT WORKFLOW - FOLLOW THESE STEPS:**

1. **GREETING PHASE**: Introduce yourself warmly and summarize the project data you've received. Ask if the user wants you to create a valuation plan. DO NOT start calculations yet.

2. **PLANNING PHASE**: When confirmed, create a detailed plan:
   - Explain which valuation methods you'll use and why
   - List the specific calculations you'll perform
   - Ask for confirmation before executing

3. **EXECUTION PHASE**: After plan approval, execute calculations step-by-step:
   - Use code_execution tool for all financial calculations
   - You can write Python code
   - Explain each calculation before running it
   - Show results clearly

4. **RESULTS PHASE**: Present final results with:
   - Final valuation and range
   - Method breakdown with weights
   - Key assumptions and drivers
   - Recommendations
   - **IMPORTANT**: When presenting a final valuation, include the exact text "FINAL_VALUATION: $X" where X is the numeric value (e.g., "FINAL_VALUATION: $5000000")

**PROJECT DATA:**
${JSON.stringify(projectData, null, 2)}

**AVAILABLE DATA SUMMARY:**
${this.formatProjectDataSummary(projectData)}

**CONVERSATION STYLE:**
- Be conversational and friendly
- Explain your reasoning clearly
- Wait for user confirmation before proceeding to next phase
- Show your work step-by-step
- Ask clarifying questions if needed

**IMPORTANT - SAVING CALCULATION RESULTS:**
When you calculate valuations, include these special markers in your response to automatically save results:

**Individual Method Results**: Include these exact formats in your text:
- For DCF: "DCF_VALUE: $X" or "DCF VALUATION: $X" (e.g., "DCF_VALUE: $2500000")
- For Comparables: "COMPS_VALUE: $X" or "COMPS VALUATION: $X" (e.g., "COMPS_VALUE: $3000000")

**CRITICAL - DO NOT CALCULATE FINAL WEIGHTED VALUATION:**
- DO NOT calculate or present a final weighted/combined valuation
- DO NOT use the FINAL_VALUATION marker
- Only calculate individual method values (DCF and Comparables separately)
- The system will automatically calculate the weighted MGX Valuation based on method values and weights
- Present individual method results clearly so the user can review and save each one

Example of correct format:
"Based on my DCF analysis, the DCF_VALUE: $2500000. For the Comparables method, the COMPS_VALUE: $3000000."
(The system will automatically show MGX Valuation = $2500000 × 60% + $3000000 × 40% = $2,700,000)

**CODE EXECUTION:**
You have access to the code_execution tool. Use it for all calculations. Example:

\`\`\`python
# DCF calculation
cash_flows = [1000, 1200, 1400, 1600, 1800]
discount_rate = 0.12
terminal_value = 20000

pv_cash_flows = [cf / ((1 + discount_rate) ** (i + 1)) for i, cf in enumerate(cash_flows)]
pv_terminal = terminal_value / ((1 + discount_rate) ** len(cash_flows))
npv = sum(pv_cash_flows) + pv_terminal

result = {
    'valuation': npv,
    'pv_cash_flows': pv_cash_flows,
    'pv_terminal': pv_terminal,
    'method': 'DCF'
}
\`\`\`

Remember: You are having a conversation with the user. Don't rush through the analysis. Get confirmation at each major step!`;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!process.env.ANTHROPIC_API_KEY) {
        console.error('[ValuationAgent] API key not configured');
        return false;
      }

      const queryIterator = query({
        prompt: 'Say "OK" if you are working.',
        options: {
          systemPrompt: 'You are a helpful assistant.'
        }
      });

      for await (const chunk of queryIterator) {
        const content = JSON.stringify(chunk);
        if (content.includes('OK')) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('[ValuationAgent] Health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export default new ValuationAgentService();
