# Putting It All Together: Building a Simple README Agent

Let’s build a practical agent that analyzes TypeScript files and generates a README. This demonstrates how the GAME components work together.

## The Agent’s Purpose
Our README agent will:

1. Discover TypeScript files in a directory
2. Read and analyze each file
3. Generate a README based on its findings

## Defining the GAME Components

### Goals

```typescript
const goals = [
  { name: 'discover', description: 'Find all TypeScript files', priority: 10 },
  { name: 'analyze', description: 'Read and understand each file', priority: 8 },
  { name: 'summarize', description: 'Generate a README', priority: 5 },
];
```

Priority guides which goal to pursue first (higher = more urgent).

### Actions

```typescript
defineTool({
  name: 'listFiles',
  description: 'Lists all TypeScript files in the directory',
  schema: z.object({}),
  tags: ['file_operations'],
  execute: () => fs.readdirSync('.').filter(f => f.endsWith('.ts')),
});

defineTool({
  name: 'readFile',
  description: 'Reads a file',
  schema: z.object({
    fileName: z.string().describe('Name of the file to read'),
  }),
  tags: ['file_operations'],
  execute: ({ fileName }) => fs.readFileSync(fileName, 'utf-8'),
});

defineTool({
  name: 'terminate',
  description: 'Ends execution with the final README',
  schema: z.object({
    message: z.string().describe('Final output'),
  }),
  tags: ['system'],
  terminal: true,
  execute: ({ message }) => message,
});
```

### Assembling the Agent

```typescript
function createReadmeAgent() {
  return new AgentBuilder()
    .withLanguage(new FunctionCallingLanguage())
    .withGoals(goals)
    .withToolRegistry(new ToolRegistry({
      tags: ['file_operations', 'system'],
    }))
    .build();
}

// Run it
const agent = createReadmeAgent();
await agent.run('Analyze the TypeScript files and generate a README.');
```

### Execution Flow

Iteration 1: Agent sees “discover” goal → calls listFiles() → gets ['Agent.ts', 'Tool.ts']

Iteration 2-3: Agent focuses on “analyze” → calls readFile('Agent.ts'), then readFile('Tool.ts')

Iteration 4: Agent addresses “summarize” → synthesizes findings → calls terminate() with README content

### The Power of Modularity

Different agents with the same loop, different behaviors:

```typescript
// Read-only agent
const readOnlyAgent = new AgentBuilder()
  .withToolRegistry(new ToolRegistry({ tags: ['read'] }))
  .build();

// Python file agent
const pythonAgent = new AgentBuilder()
  .withToolRegistry(new ToolRegistry({ tags: ['python'] }))
  .build();

// Debug agent (shows reasoning)
const debugAgent = new AgentBuilder()
  .withLanguage(new JsonActionLanguage())
  .build();
```

The GAME framework makes it easy to create specialized agents by mixing and matching components while the core loop stays the same.
