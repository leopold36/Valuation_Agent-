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
  type: 'text' | 'code' | 'result' | 'thinking';
  content: string;
  metadata?: any;
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
   * Start a new valuation conversation for a project
   */
  async startValuation(projectId: number, projectData: ProjectData): Promise<AgentResponse> {
    console.log(`[ValuationAgent] Starting valuation for project ${projectId}`);

    // Create a new thread in the database
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

    const conversation = {
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
  async sendMessage(projectId: number, message: string): Promise<AgentResponse> {
    const conversation = this.conversations.get(projectId);

    if (!conversation) {
      throw new Error(`No active conversation for project ${projectId}`);
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
   * Build system prompt with project context
   */
  private buildSystemPrompt(projectData: ProjectData): string {
    return `You are a friendly and professional financial valuation expert named Claude. You specialize in enterprise valuations.

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

**PROJECT DATA:**
${JSON.stringify(projectData, null, 2)}

**CONVERSATION STYLE:**
- Be conversational and friendly
- Explain your reasoning clearly
- Wait for user confirmation before proceeding to next phase
- Show your work step-by-step
- Ask clarifying questions if needed

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
