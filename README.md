# Valuation Agent

A desktop application for financial valuations powered by Claude AI with built-in code execution.

## Features

- **AI-Powered Valuations**: Conversational interface with Claude AI agent
- **Built-in Code Execution**: Python/JavaScript calculations run securely in sandbox
- **Multiple Valuation Methods**: DCF, Comparables, Precedent Transactions, Asset-Based
- **Interactive Analysis**: Ask questions and explore scenarios with the AI
- **Local Database**: All data stored locally in SQLite

## Architecture

```
Electron Desktop App
├── React Frontend (TypeScript)
├── Main Process (Node.js)
│   ├── Database (SQLite)
│   └── Claude Agent SDK
│       └── Built-in Code Execution Sandbox
└── Claude API
```

**No external services required** - Everything runs locally except Claude API calls.

## Setup

### Prerequisites
- Node.js 18+
- Anthropic API key ([get one here](https://console.anthropic.com))

### Installation

```bash
# Install dependencies
npm install

# Configure API key
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

### Development

```bash
# Run in development mode
npm run electron:dev
```

This will:
1. Start Vite dev server (http://localhost:5173)
2. Launch Electron with hot reload
3. Open DevTools automatically

### Production Build

```bash
# Build and package
npm run dist
```

Creates distributable packages in `dist/` folder.

## How It Works

### 1. Create a Project
- Name your valuation project
- Add investment type, description, etc.

### 2. Configure Valuation Methods
- Choose methods (DCF, Comps, etc.)
- Input parameters (cash flows, multiples, etc.)
- Set weights for each method

### 3. Run Agent Valuation
Click "🤖 Agent Valuation" to start conversation with Claude:
- Agent introduces itself and reviews your data
- Creates a valuation plan for approval
- Executes calculations step-by-step with explanations
- Presents final results with breakdown

### 4. Interactive Analysis
- Ask follow-up questions
- Request scenario analysis
- Get explanations of assumptions
- Explore sensitivity to inputs

## Agent Capabilities

The Claude agent can:
- **Execute Code**: Run Python/JS calculations in secure sandbox
- **Explain Reasoning**: Show work step-by-step
- **Ask Questions**: Clarify unclear inputs
- **Provide Insights**: Highlight key drivers and risks
- **Compare Methods**: Explain differences between DCF and Comps

Example conversation:
```
User: Run a valuation for this SaaS company

Agent: I'll create a DCF and Comparables analysis.
       For DCF, I'll project cash flows with 30% growth...
       [executes code]
       NPV = $5.2M

User: What if growth is only 20%?

Agent: Let me recalculate with 20% growth...
       [executes code]
       NPV = $3.8M (27% lower)
```

## Tech Stack

- **Frontend**: React 19 + TypeScript + Tailwind CSS
- **Desktop**: Electron
- **Database**: better-sqlite3
- **AI**: Claude Agent SDK with code execution
- **Charts**: Recharts

## Project Structure

```
valuation-agent/
├── src/
│   ├── components/          # React components
│   │   └── ProjectDetail.tsx
│   ├── services/
│   │   └── valuationAgent.ts  # Claude Agent SDK integration
│   ├── database.js          # SQLite manager
│   ├── types.ts             # TypeScript types
│   └── App.tsx              # Main React app
├── main.js                  # Electron main process
├── preload.js               # IPC bridge
└── .env                     # API keys (gitignored)
```

## Database Schema

- `projects` - Valuation projects
- `methods` - Valuation methods per project
- `metrics` - Input parameters per method
- `valuation_methods` - Method metadata
- `input_parameters` - Parameter definitions
- `computation_history` - Execution logs

## Configuration

### Environment Variables

Create `.env` in project root:

```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### Claude Agent Settings

Edit `src/services/valuationAgent.ts` to customize:
- System prompt (agent personality)
- Code execution timeout
- Response streaming behavior

## Development Notes

### TypeScript Support

The project uses `ts-node` to load TypeScript files in Electron's main process:
- `src/services/valuationAgent.ts` is loaded directly
- No separate build step needed for development
- Production builds compile to JS

### IPC Architecture

Communication flow:
```
React → preload.js → main.js → valuationAgent.ts → Claude API
                                     ↓
                              Code Execution Sandbox
```

All IPC calls are type-safe via `src/types.ts`.

## Troubleshooting

### "ANTHROPIC_API_KEY not configured"
- Ensure `.env` file exists in project root
- Check API key format: `sk-ant-...`
- Restart app after editing `.env`

### TypeScript errors in main process
- Run `npm install` to ensure ts-node is installed
- Check `tsconfig.json` is present

### Native Module Issues

If you encounter issues with better-sqlite3:

```bash
npm run postinstall
# or
npx electron-rebuild
```

### Agent not responding
- Check console for errors
- Verify API key is valid
- Ensure internet connection for Claude API

## Cost Estimates

**Typical valuation conversation:**
- Input: ~2,000 tokens (project data + prompts)
- Output: ~3,000 tokens (explanations + code)
- Cost: ~$0.15 - 0.50 per valuation

Code execution is **free** (runs locally in sandbox).

## Available Scripts

- `npm run dev` - Start Vite dev server only
- `npm run electron:dev` - Start both Vite and Electron in development mode
- `npm run build` - Build the app for production
- `npm run dist` - Build and package the app with electron-builder
- `npm run postinstall` - Rebuild native modules for Electron

## License

ISC
