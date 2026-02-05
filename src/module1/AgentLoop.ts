/**
 * Module 1: The Agent Loop - Text Parsing Agent
 *
 * This module introduces the fundamental agent loop pattern using TEXT-BASED
 * action parsing (not OpenAI function calling). This demonstrates how agents
 * can work with any LLM by parsing structured output from responses.
 *
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │                      THE AGENT LOOP                         │
 *   │                                                             │
 *   │   1. Construct prompt (rules + memory + user request)       │
 *   │                           ↓                                 │
 *   │   2. Send to LLM, get response                              │
 *   │                           ↓                                 │
 *   │   3. Parse response to extract action (TEXT PARSING!)       │
 *   │                           ↓                                 │
 *   │   4. Execute action in the environment                      │
 *   │                           ↓                                 │
 *   │   5. Update memory with results                             │
 *   │                           ↓                                 │
 *   │   6. Check if done → if not, go to step 1                   │
 *   └─────────────────────────────────────────────────────────────┘
 *
 * Key concepts demonstrated:
 * - **Text-based action parsing** using ```action code blocks
 * - **Memory accumulation** across loop iterations
 * - **Tool execution** with result handling
 * - **Termination conditions** via terminal actions
 *
 * This is the foundation before introducing:
 * - Function calling (Module 3)
 * - The GAME framework (Module 3)
 * - Zod-based tool registration (Module 4)
 *
 * Run with: npm run module1:agent
 */

import { loadEnv } from '../shared/env';
import { Message, LLM } from '../shared';
import { ConversationMemory } from '../shared/ConversationMemory';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A parsed action from text-based LLM responses.
 *
 * In text-parsing agents, the LLM outputs structured JSON inside
 * markdown code blocks that we parse to determine what to do.
 */
export interface TextParsedAction {
  /** Name of the tool to invoke */
  toolName: string;

  /** Arguments to pass to the tool */
  args: Record<string, unknown>;
}

/**
 * Result from executing an action.
 */
export interface ActionExecutionResult {
  /** Whether execution was successful */
  success: boolean;

  /** The result data (if successful) */
  result?: unknown;

  /** Error message (if failed) */
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Maximum iterations to prevent infinite loops */
const MAX_ITERATIONS = 10;

/**
 * The system prompt that defines the agent's behavior.
 *
 * Key elements:
 * 1. Defines available tools with their signatures
 * 2. Specifies the EXACT output format (```action blocks)
 * 3. Instructs when to use the terminate tool
 *
 * This is a TEXT-PARSING agent - it doesn't use OpenAI's function calling.
 * Instead, we ask the LLM to output JSON in a specific format that we parse.
 */
const AGENT_RULES = `You are an agent that can perform tasks using tools.

Available tools:
1. printMessage(message: string): Print a message to the console.
2. listFiles(): List all files in the current directory. Returns string[].
3. readFile(fileName: string): Read and return the contents of a file.
4. terminate(message: string): End the session with a final summary.

IMPORTANT RULES:
- When asked about files, ALWAYS list them first before reading.
- EVERY response MUST include exactly one action in a code block.
- Use terminate when you have completed the user's request.

Response format - you MUST wrap your action in this exact format:

\`\`\`action
{"toolName": "toolName", "args": {"argName": "argValue"}}
\`\`\`

Example responses:

To list files:
\`\`\`action
{"toolName": "listFiles", "args": {}}
\`\`\`

To read a file:
\`\`\`action
{"toolName": "readFile", "args": {"fileName": "package.json"}}
\`\`\`

To finish:
\`\`\`action
{"toolName": "terminate", "args": {"message": "Task completed successfully."}}
\`\`\`
`;

// ─────────────────────────────────────────────────────────────────────────────
// Tool Implementations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Simple tool implementations for the text-parsing agent.
 *
 * In later modules, we'll use Zod-based tool definitions.
 * Here we keep it simple to focus on the agent loop pattern.
 */
const tools = {
  printMessage(message: string): string {
    console.log(`📢 ${message}`);
    return 'Message printed';
  },

  listFiles(): string[] {
    const fs = require('fs');
    const files = fs.readdirSync('.');
    console.log(`📁 Found ${files.length} files`);
    return files;
  },

  readFile(fileName: string): string {
    const fs = require('fs');
    try {
      const content = fs.readFileSync(fileName, 'utf-8');
      console.log(`📄 Read ${content.length} characters from ${fileName}`);
      return content;
    } catch (error) {
      throw new Error(`Failed to read ${fileName}: ${error}`);
    }
  },

  terminate(message: string): string {
    console.log(`✅ Terminating: ${message}`);
    return message;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Action Parsing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parses an action from the LLM's text response.
 *
 * This is the KEY function for text-parsing agents. It:
 * 1. Finds the ```action code block
 * 2. Extracts the JSON content
 * 3. Parses it into a structured action
 *
 * If parsing fails, we return a terminate action with the raw response.
 * This graceful degradation prevents the agent from getting stuck.
 *
 * @param response - The raw LLM response text
 * @returns Parsed action with tool name and arguments
 */
export function parseTextAction(response: string): TextParsedAction {
  const startMarker = '```action';
  const endMarker = '```';

  const startIndex = response.indexOf(startMarker);

  if (startIndex === -1) {
    // No action block found - gracefully degrade to terminate
    console.log('⚠️  No ```action block found, treating as terminate');
    return {
      toolName: 'terminate',
      args: { message: response },
    };
  }

  const contentStart = startIndex + startMarker.length;
  const endIndex = response.indexOf(endMarker, contentStart);

  if (endIndex === -1) {
    console.log('⚠️  Unclosed ```action block, treating as terminate');
    return {
      toolName: 'terminate',
      args: { message: response },
    };
  }

  const jsonStr = response.substring(contentStart, endIndex).trim();

  try {
    const parsed = JSON.parse(jsonStr);

    // Support both toolName and tool_name formats
    const toolName = parsed.toolName ?? parsed.tool_name ?? parsed.tool;

    if (!toolName) {
      throw new Error('Missing tool name in action');
    }

    return {
      toolName,
      args: parsed.args ?? {},
    };
  } catch (error) {
    console.log(`⚠️  Failed to parse action JSON: ${error}`);
    return {
      toolName: 'terminate',
      args: { message: `Parse error: ${error}. Original response: ${response}` },
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Action Execution
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Executes a parsed action.
 *
 * @param action - The action to execute
 * @returns Execution result with success/error status
 */
export function executeTextAction(action: TextParsedAction): ActionExecutionResult {
  console.log(`\n🔧 Executing: ${action.toolName}`, JSON.stringify(action.args));

  try {
    switch (action.toolName) {
      case 'printMessage': {
        const message = action.args.message as string;
        const result = tools.printMessage(message);
        return { success: true, result };
      }

      case 'listFiles': {
        const result = tools.listFiles();
        return { success: true, result };
      }

      case 'readFile': {
        const fileName = action.args.fileName as string;
        if (!fileName) {
          return { success: false, error: 'fileName argument is required' };
        }
        const result = tools.readFile(fileName);
        return { success: true, result };
      }

      case 'terminate': {
        const message = action.args.message as string;
        const result = tools.terminate(message);
        return { success: true, result };
      }

      default: {
        return {
          success: false,
          error: `Unknown tool: ${action.toolName}`,
        };
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent Loop
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Runs the text-parsing agent loop.
 *
 * This is the CORE pattern that all agents follow:
 * 1. Build prompt from rules + memory
 * 2. Get LLM response
 * 3. Parse action from text
 * 4. Execute action
 * 5. Update memory
 * 6. Check termination, repeat if needed
 *
 * @param userInput - The user's task/request
 * @param llm - The LLM instance
 * @param maxIterations - Maximum loop iterations
 * @returns The final conversation memory
 */
export async function runTextParsingAgentLoop(
  userInput: string,
  llm: LLM,
  maxIterations = MAX_ITERATIONS
): Promise<ConversationMemory> {
  console.log('\n' + '='.repeat(60));
  console.log('Text-Parsing Agent Loop');
  console.log('='.repeat(60));
  console.log(`\n📋 User Request: ${userInput}`);

  // Initialize memory
  const memory = new ConversationMemory();
  memory.addUser(userInput);

  let iterations = 0;

  // THE AGENT LOOP
  while (iterations < maxIterations) {
    console.log(`\n${'─'.repeat(40)}`);
    console.log(`Iteration ${iterations + 1}/${maxIterations}`);
    console.log('─'.repeat(40));

    // Step 1: Build prompt from rules + memory
    // The rules define the agent's behavior and available tools
    // Memory provides context from previous iterations
    const messages: Message[] = [
      Message.system(AGENT_RULES),
      ...memory.toMessages(),
    ];

    // Step 2: Get LLM response
    console.log('\n📤 Sending prompt to LLM...');
    const response = await llm.generate(messages);
    console.log('\n📥 LLM Response:');
    console.log(response.substring(0, 300) + (response.length > 300 ? '...' : ''));

    // Step 3: Parse action from text
    // This is what makes it a TEXT-PARSING agent
    const action = parseTextAction(response);
    console.log(`\n🎯 Parsed Action: ${action.toolName}`, action.args);

    // Step 4: Execute action
    const result = executeTextAction(action);
    console.log('📊 Result:', JSON.stringify(result).substring(0, 200));

    // Step 5: Update memory
    memory.addAssistant(response);
    memory.addEnvironment(JSON.stringify(result));

    // Step 6: Check termination
    if (action.toolName === 'terminate') {
      console.log('\n✅ Agent terminated');
      break;
    }

    iterations++;
  }

  if (iterations >= maxIterations) {
    console.log('\n⚠️  Maximum iterations reached');
  }

  return memory;
}

// ─────────────────────────────────────────────────────────────────────────────
// Alternative: Simple Procedural Version
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A minimal procedural version of the agent loop.
 *
 * This matches the Python version more closely - no classes,
 * just simple functions and a while loop.
 */
export async function runSimpleAgentLoop(
  userInput: string,
  llm: LLM
): Promise<Message[]> {
  // Memory is just an array of messages
  const memory: Message[] = [
    { role: 'user', content: userInput } as Message,
  ];

  const rules: Message = Message.system(AGENT_RULES);

  let iterations = 0;

  while (iterations < MAX_ITERATIONS) {
    // 1. Build prompt
    const prompt = [rules, ...memory];

    // 2. Get response
    console.log('Agent thinking...');
    const response = await llm.generate(prompt);
    console.log(`Agent response: ${response.substring(0, 200)}...`);

    // 3. Parse action
    const action = parseTextAction(response);

    // 4. Execute and get result
    const result = executeTextAction(action);
    console.log(`Action result: ${JSON.stringify(result).substring(0, 200)}`);

    // 5. Update memory
    memory.push(Message.assistant(response));
    memory.push(Message.user(JSON.stringify(result)));

    // 6. Check termination
    if (action.toolName === 'terminate') {
      console.log(action.args.message);
      break;
    }

    iterations++;
  }

  return memory;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Entry Point
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  loadEnv();

  try {
    const llm = new LLM();

    // Example task
    const userRequest =
      'What files are in this directory? Please read the package.json ' +
      'file and tell me about this project.';

    const memory = await runTextParsingAgentLoop(userRequest, llm);

    console.log('\n' + '='.repeat(60));
    console.log('Agent Loop Completed');
    console.log('='.repeat(60));

    console.log('\n📚 Key Takeaways:');
    console.log('1. The agent loop: prompt → response → parse → execute → memory → repeat');
    console.log('2. Text parsing works with ANY LLM (no function calling needed)');
    console.log('3. Memory accumulates context across iterations');
    console.log('4. Terminal actions end the loop');

    console.log(`\n📊 Final memory has ${memory.length} items`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().then(() => {
    console.log('\n✅ Module 1 completed successfully');
  }).catch((error) => {
    console.error('❌ Module 1 failed:', error);
    process.exit(1);
  });
}

// Re-export for backwards compatibility
export {
  AGENT_RULES as AGENT_SYSTEM_PROMPT,
  parseTextAction as parseAction,
  executeTextAction as executeAction,
  runTextParsingAgentLoop as runAgentLoop,
};
