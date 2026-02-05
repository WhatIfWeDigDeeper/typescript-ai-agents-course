/**
 * Module 2: Agent Loop with Function Calling
 *
 * This combines the agent loop pattern from Module 1 with the function
 * calling feature from earlier in this module.
 *
 * The result is a more robust agent that:
 * - Uses structured function calls instead of text parsing
 * - Has better tool invocation reliability
 * - Can dynamically register new tools
 *
 * Run with: npm run module2:agent
 */

import { loadEnv } from '../shared/env';
import { Message, LLM, Tool, Prompt, Action, ActionResult, FileTools } from '../shared';

/** Maximum iterations to prevent infinite loops */
const MAX_ITERATIONS = 10;

/** Function that implements a tool */
type ToolFunction = (args: Record<string, unknown>) => unknown | Promise<unknown>;

/**
 * Agent that uses OpenAI function calling for tool invocation.
 *
 * This is more reliable than text-based action parsing because:
 * 1. The LLM outputs structured JSON via the function calling API
 * 2. Arguments are validated against schemas
 * 3. No regex or string parsing needed
 */
class FunctionCallingAgent {
  private readonly tools: Tool[] = [];
  private readonly toolFunctions: Map<string, ToolFunction> = new Map();
  private readonly llm: LLM;

  constructor(
    private readonly systemPrompt: string,
    private readonly maxIterations: number = MAX_ITERATIONS,
    llmConfig?: { model?: string }
  ) {
    this.llm = new LLM(llmConfig);
  }

  /**
   * Registers a tool with its implementation.
   *
   * @param tool - Tool definition (name, description, parameters)
   * @param fn - Function to execute when tool is called
   */
  registerTool(tool: Tool, fn: ToolFunction): this {
    this.tools.push(tool);
    this.toolFunctions.set(tool.name, fn);
    return this;  // Allow chaining
  }

  /**
   * Runs the agent loop for a user request.
   *
   * @param userRequest - What the user wants to accomplish
   * @returns The conversation history
   */
  async run(userRequest: string): Promise<Message[]> {
    console.log('\n' + '='.repeat(60));
    console.log('Function Calling Agent');
    console.log('='.repeat(60));
    console.log(`\n📋 Request: ${userRequest}`);
    console.log(`🔧 Available tools: ${this.tools.map(t => t.name).join(', ')}`);

    // Initialize memory
    const memory: Message[] = [
      Message.system(this.systemPrompt),
      Message.user(userRequest),
    ];

    let iterations = 0;

    while (iterations < this.maxIterations) {
      console.log(`\n${'─'.repeat(40)}`);
      console.log(`Iteration ${iterations + 1}/${this.maxIterations}`);

      // Create prompt with tools
      const prompt = new Prompt(memory, this.tools);

      // Get LLM response
      const response = await this.llm.generate(prompt);
      console.log('\n📥 Response:', response.substring(0, 150) + '...');

      // Try to parse as function call
      let action: Action;
      try {
        action = Action.fromJSON(JSON.parse(response));
      } catch {
        // Not a function call - LLM responded with text
        console.log('📝 Text response (no function call)');
        memory.push(Message.assistant(response));
        break;
      }

      console.log(`\n🎯 Tool call: ${action.toolName}`);
      console.log('   Args:', JSON.stringify(action.args));

      // Check for termination
      if (action.isTerminate()) {
        const message = action.getArg<string>('message') ?? 'Done.';
        console.log(`\n✅ Terminated: ${message}`);
        memory.push(Message.assistant(response));
        break;
      }

      // Execute the tool
      const result = await this.executeAction(action);
      console.log('📊 Result:', JSON.stringify(ActionResult.toJSON(result)).substring(0, 1000));

      // Update memory
      memory.push(Message.assistant(response));
      memory.push(Message.user(JSON.stringify(ActionResult.toJSON(result))));

      iterations++;
    }

    if (iterations >= this.maxIterations) {
      console.log('\n⚠️  Maximum iterations reached');
    }

    return memory;
  }

  /**
   * Executes a tool action and returns the result.
   */
  private async executeAction(action: Action): Promise<ActionResult<unknown>> {
    const fn = this.toolFunctions.get(action.toolName);

    if (!fn) {
      return ActionResult.error(`Unknown tool: ${action.toolName}`);
    }

    try {
      const result = await fn(action.args);
      return ActionResult.success(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return ActionResult.error(`Tool execution failed: ${message}`);
    }
  }

  /**
   * Returns the registered tools.
   */
  getTools(): readonly Tool[] {
    return this.tools;
  }
}

/**
 * Creates a file explorer agent with standard tools.
 */
function createFileExplorerAgent(): FunctionCallingAgent {
  const agent = new FunctionCallingAgent(
    'You are a file explorer agent. Help users navigate and read files.\n\n' +
    'Guidelines:\n' +
    '- Always list files before reading them\n' +
    '- Summarize file contents helpfully\n' +
    '- Use terminate when the task is complete'
  );

  // Register tools with implementations
  agent
    .registerTool(Tool.listFiles(), () => FileTools.listFiles())
    .registerTool(Tool.readFile(), (args) => {
      const fileName = args.fileName as string;
      return FileTools.readFile(fileName);
    })
    .registerTool(Tool.terminate(), (args) => {
      // Just return the message - the loop handles termination
      return args.message;
    });

  return agent;
}

/**
 * Demonstrates adding a custom tool at runtime.
 */
async function customToolDemo(): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('Custom Tool Demo');
  console.log('='.repeat(60));

  const agent = new FunctionCallingAgent(
    'You are a helpful assistant with various tools.'
  );

  // Add a custom calculator tool
  agent.registerTool(
    new Tool(
      'calculate',
      'Performs basic arithmetic calculations',
      {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: 'Mathematical expression like "2 + 2" or "10 * 5"',
          },
        },
        required: ['expression'],
      }
    ),
    (args) => {
      const expr = args.expression as string;
      // Simple safe eval for basic math
      const sanitized = expr.replace(/[^0-9+\-*/().  ]/g, '');
      try {
        // eslint-disable-next-line no-eval
        return eval(sanitized);
      } catch {
        throw new Error(`Cannot evaluate: ${expr}`);
      }
    }
  );

  agent.registerTool(Tool.terminate(), (args) => args.message);

  await agent.run('What is 42 * 17?');
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Entry Point
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  loadEnv();

  try {
    // Demo 1: File explorer
    const fileAgent = createFileExplorerAgent();
    await fileAgent.run(
      'What files are in this directory? Read the package.json and tell me about the project.'
    );

    // Demo 2: Custom tools
    await customToolDemo();

    console.log('\n✅ Function calling agent examples completed!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().then(() => {
    console.log('\n✅ Module 2 completed successfully');
  }).catch((error) => {
    console.error('❌ Module 2 failed:', error);
    process.exit(1);
  });
}

export { FunctionCallingAgent, createFileExplorerAgent };
