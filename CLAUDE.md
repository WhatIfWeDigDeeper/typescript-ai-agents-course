# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Type-check without emitting
npm run typecheck

# Run all tests
npm test

# Run a single test file
npx jest src/shared/Tool.test.ts

# Run tests in watch mode
npm run test:watch

# Run a specific module
npm run module1:agent
npm run module2:agent
npm run module3:game
npm run module4:self-prompting
```

Requires `OPENAI_API_KEY` in `.env` (copy from `.env.example`). The default model is `gpt-5-nano` (overridable via `OPENAI_MODEL` env var).

TypeScript is strict: `noImplicitAny`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns` are all enabled. Test files (`*.test.ts`) are excluded from the main `tsconfig.json` compilation.

## Architecture

This is a course codebase that teaches AI agent patterns by progressive example. The `src/shared/` directory contains the full reusable framework; the `src/module*/` directories contain standalone examples that build toward using it.

### Core Abstractions (`src/shared/`)

**GAME Framework** — The central mental model:
- **Goals** (`AgentLanguage.ts`: `Goal`) — What the agent is trying to achieve
- **Actions** (`Tool.ts`, `defineTool.ts`) — Tools the agent can call
- **Memory** (`ConversationMemory.ts`) — Conversation history
- **Environment** (`Environment.ts`) — Where actions are executed

**Agent loop** (`Agent.ts`): `constructPrompt → generateResponse → parseResponse → executeAction → updateMemory → repeat until terminal tool or maxIterations`

**AgentLanguage** (`AgentLanguage.ts`) — Abstract class with three implementations:
- `NaturalLanguage` — Simple Q&A, terminates on every response
- `JsonActionLanguage` — Parses ` ```action ` blocks from LLM text output
- `FunctionCallingLanguage` — Uses OpenAI native function calling API

**Tool definition** — Two patterns:
1. `Tool` class directly (manual JSON Schema)
2. `defineTool()` with Zod schema (preferred; auto-generates JSON Schema, validates at runtime, registers globally)

**ToolRegistry** (`ToolRegistry.ts`) — Filters globally registered tools by tags or names. Tools defined via `defineTool()` auto-register in the global registry; `ToolRegistry` is constructed to select a subset. The `terminal: true` flag on a tool causes the agent loop to stop.

**LLM** (`LLM.ts`) — OpenAI wrapper. When tools are present in a `Prompt`, it uses the function calling API and returns `JSON.stringify({ tool, args })`; otherwise returns plain text.

**Prompt** (`Prompt.ts`) — Bundles `Message[]` + `Tool[]` together. The LLM class checks `prompt.hasTools()` to decide which API path to use.

### Tool Registration Pattern

```typescript
// 1. Define + auto-register with Zod
const myTool = defineTool({
  name: 'myTool',
  description: '...',
  schema: z.object({ arg: z.string() }),
  tags: ['my_tag'],
  terminal: false,
  execute: async ({ arg }) => { ... },
});

// 2. Create a registry for the agent (filters from global registry)
const registry = new ToolRegistry({ tags: ['my_tag', 'system'] });

// 3. Wire into Agent
const agent = new AgentBuilder()
  .withGoal('Assistant', 'Help the user')
  .withLanguage(new FunctionCallingLanguage())
  .withRegistry(registry)
  .withLLM(llm)
  .build();
```

### Module Progression

- **module1** — Raw LLM calls → multi-turn conversation → manual agent loop
- **module2** — OpenAI function calling added to the loop
- **module3** — Full GAME framework (`GAMEAgent.ts`)
- **module4** — Self-prompting / agent delegation patterns
