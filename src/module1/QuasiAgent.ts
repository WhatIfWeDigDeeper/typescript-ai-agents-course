/**
 * Module 1: Quasi-Agent - Iterative Function Builder
 *
 * A "quasi-agent" maintains conversation history but doesn't take autonomous
 * actions using tools. It's the stepping stone between simple prompting and
 * a full agent with tool execution.
 *
 * This module demonstrates:
 * 1. Multi-turn conversations with memory
 * 2. **Prompt chaining** - each step builds on previous results
 * 3. **Memory manipulation** - controlling what the LLM "sees" in history
 * 4. **Code block extraction** - parsing structured output from LLM responses
 *
 * The key insight is that we can guide an LLM through a multi-step process
 * by carefully crafting the conversation history. This is the foundation
 * that full agents build upon.
 *
 * Run with: npm run module1:quasi
 */

import { loadEnv } from '../shared/env';
import { Message, LLM } from '../shared';

// ─────────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extracts a code block from an LLM response.
 *
 * LLMs often wrap code in markdown code blocks like:
 * ```typescript
 * function foo() { ... }
 * ```
 *
 * This function extracts just the code content.
 *
 * @param response - The full LLM response
 * @param language - Optional language hint (e.g., 'typescript', 'python')
 * @returns The extracted code, or the original response if no code block found
 */
export function extractCodeBlock(response: string, language = 'typescript'): string {
  // If no code blocks, return as-is
  if (!response.includes('```')) {
    return response;
  }

  // Find the first code block
  const parts = response.split('```');

  if (parts.length < 2) {
    return response;
  }

  // The code is in parts[1], potentially prefixed with language
  let code = parts[1].trim();

  // Remove language prefix if present (e.g., "typescript\n" at start)
  const firstNewline = code.indexOf('\n');
  if (firstNewline !== -1) {
    const firstLine = code.substring(0, firstNewline).toLowerCase();
    // Check if first line is just a language identifier
    if (firstLine === language || firstLine === 'ts' || firstLine === 'js' ||
        firstLine === 'javascript' || firstLine === 'python' || firstLine === 'py') {
      code = code.substring(firstNewline + 1);
    }
  }

  return code.trim();
}

/**
 * Wraps code in a markdown code block.
 *
 * @param code - The code to wrap
 * @param language - The language for syntax highlighting
 */
export function wrapCodeBlock(code: string, language = 'typescript'): string {
  return '```' + language + '\n' + code + '\n```';
}

// ─────────────────────────────────────────────────────────────────────────────
// QuasiAgent Class
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A quasi-agent that maintains conversation history with control over
 * what gets stored.
 *
 * Key concept: We can **manipulate the memory** to guide the LLM's behavior.
 * By controlling what the assistant "sees" as its previous responses,
 * we influence how it continues the conversation.
 *
 * This is NOT a full agent because it:
 * - Doesn't parse responses for tool calls
 * - Doesn't execute actions in an environment
 * - Doesn't make autonomous decisions
 *
 * But it IS a stepping stone because it:
 * - Maintains conversation context
 * - Can chain multiple prompts together
 * - Demonstrates memory manipulation techniques
 */
export class QuasiAgent {
  private readonly history: Message[] = [];
  private readonly llm: LLM;
  private readonly systemPrompt: string;

  constructor(
    systemPrompt: string,
    llmConfig?: { model?: string; debug?: boolean }
  ) {
    this.llm = new LLM(llmConfig);
    this.systemPrompt = systemPrompt;
    this.history.push(Message.system(systemPrompt));
  }

  /**
   * Sends a message and gets a response, maintaining full history.
   *
   * This adds both the user message and the raw assistant response
   * to the conversation history.
   */
  async chat(userMessage: string): Promise<string> {
    this.history.push(Message.user(userMessage));
    const response = await this.llm.generate(this.history);
    this.history.push(Message.assistant(response));
    return response;
  }

  /**
   * Sends a message but stores a MODIFIED version of the response in history.
   *
   * This is a key technique! By controlling what gets stored as the
   * "assistant's response", we can:
   * - Strip out commentary and keep only code
   * - Make the LLM think it always outputs in a consistent format
   * - Guide subsequent responses based on a cleaned-up version
   *
   * @param userMessage - The message to send
   * @param transformResponse - Function to transform the response before storing
   * @returns The original (untransformed) response
   */
  async chatWithMemoryManipulation(
    userMessage: string,
    transformResponse: (response: string) => string
  ): Promise<string> {
    this.history.push(Message.user(userMessage));

    const response = await this.llm.generate(this.history);

    // Store the TRANSFORMED version in history
    // This is the key memory manipulation technique!
    const transformedResponse = transformResponse(response);
    this.history.push(Message.assistant(transformedResponse));

    // Return the original for the caller to see
    return response;
  }

  /**
   * Gets the conversation history.
   */
  getHistory(): readonly Message[] {
    return this.history;
  }

  /**
   * Clears history except for the system prompt.
   */
  reset(): void {
    this.history.length = 0;
    this.history.push(Message.system(this.systemPrompt));
  }

  /**
   * Returns the number of turns (user messages) in the conversation.
   */
  get turnCount(): number {
    return this.history.filter(m => m.role === 'user').length;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Iterative Function Builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Result from the function development pipeline.
 */
export interface FunctionDevelopmentResult {
  /** The initial function code */
  initialFunction: string;

  /** Function with documentation added */
  documentedFunction: string;

  /** Test cases for the function */
  testCases: string;

  /** Suggested filename */
  filename: string;
}

/**
 * Develops a TypeScript function through iterative refinement.
 *
 * This demonstrates the **prompt chaining** pattern:
 * 1. Generate initial function from description
 * 2. Add documentation (building on step 1)
 * 3. Generate tests (building on steps 1 & 2)
 *
 * Each step uses the previous context, showing how we can guide
 * an LLM through a multi-step workflow.
 *
 * @param description - Natural language description of the function
 * @param verbose - If true, prints progress
 * @returns The developed function, documentation, and tests
 */
export async function developFunction(
  description: string,
  verbose = true
): Promise<FunctionDevelopmentResult> {
  const agent = new QuasiAgent(
    'You are a TypeScript expert helping to develop a function. ' +
    'Always output code in ```typescript code blocks.'
  );

  const log = (msg: string) => verbose && console.log(msg);

  // ───────────────────────────────────────────────────────────────────────────
  // Step 1: Generate Initial Function
  // ───────────────────────────────────────────────────────────────────────────

  log('\n📝 Step 1: Generating initial function...');

  const step1Response = await agent.chatWithMemoryManipulation(
    `Write a TypeScript function that ${description}. ` +
    'Output the function in a ```typescript code block.',

    // Memory manipulation: Store ONLY the code block
    // This makes the LLM think it always outputs just code
    (response) => wrapCodeBlock(extractCodeBlock(response))
  );

  const initialFunction = extractCodeBlock(step1Response);
  log('\n=== Initial Function ===');
  log(initialFunction);

  // ───────────────────────────────────────────────────────────────────────────
  // Step 2: Add Documentation
  // ───────────────────────────────────────────────────────────────────────────

  log('\n📝 Step 2: Adding documentation...');

  const step2Response = await agent.chatWithMemoryManipulation(
    'Add comprehensive JSDoc documentation to this function, including:\n' +
    '- Description of what it does\n' +
    '- @param tags for each parameter\n' +
    '- @returns description\n' +
    '- @example with usage\n' +
    '- @throws for any error conditions\n' +
    'Output the documented function in a ```typescript code block.',

    // Again, store only the code block
    (response) => wrapCodeBlock(extractCodeBlock(response))
  );

  const documentedFunction = extractCodeBlock(step2Response);
  log('\n=== Documented Function ===');
  log(documentedFunction);

  // ───────────────────────────────────────────────────────────────────────────
  // Step 3: Generate Test Cases
  // ───────────────────────────────────────────────────────────────────────────

  log('\n📝 Step 3: Generating test cases...');

  const step3Response = await agent.chatWithMemoryManipulation(
    'Write Jest test cases for this function, including tests for:\n' +
    '- Basic functionality (happy path)\n' +
    '- Edge cases (empty inputs, boundaries)\n' +
    '- Error conditions\n' +
    '- Various input scenarios\n' +
    'Output the tests in a ```typescript code block.',

    (response) => wrapCodeBlock(extractCodeBlock(response))
  );

  const testCases = extractCodeBlock(step3Response);
  log('\n=== Test Cases ===');
  log(testCases);

  // ───────────────────────────────────────────────────────────────────────────
  // Generate filename from description
  // ───────────────────────────────────────────────────────────────────────────

  const filename = description
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .substring(0, 30) + '.ts';

  return {
    initialFunction,
    documentedFunction,
    testCases,
    filename,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Demo Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Demonstrates the iterative function builder with a predefined example.
 */
async function demonstrateFunctionBuilder(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Module 1: Quasi-Agent - Iterative Function Builder');
  console.log('='.repeat(60));

  console.log('\nThis demo shows how a quasi-agent can guide function development');
  console.log('through multiple refinement steps using prompt chaining.\n');

  const description = 'calculates the factorial of a number';

  console.log(`📋 Function description: "${description}"`);

  const result = await developFunction(description);

  console.log('\n' + '='.repeat(60));
  console.log('Final Result');
  console.log('='.repeat(60));
  console.log(`\n📁 Suggested filename: ${result.filename}`);
  console.log('\nThe function went through 3 refinement steps:');
  console.log('1. Initial implementation');
  console.log('2. Added comprehensive documentation');
  console.log('3. Generated test cases');
}

/**
 * Demonstrates the difference between using memory and not using memory.
 */
async function demonstrateMemoryImportance(): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('Memory Importance Demo');
  console.log('='.repeat(60));

  const llm = new LLM();

  // Without memory - each call is independent
  console.log('\n❌ WITHOUT MEMORY:');

  console.log('\n👤 Message 1: "My favorite color is blue."');
  await llm.generate([
    Message.system('You are a helpful assistant.'),
    Message.user('My favorite color is blue.'),
  ]);
  console.log('(Response received but not stored)');

  console.log('\n👤 Message 2: "What is my favorite color?"');
  const noMemoryResponse = await llm.generate([
    Message.system('You are a helpful assistant.'),
    Message.user('What is my favorite color?'),
  ]);
  console.log(`🤖 Response: ${noMemoryResponse.substring(0, 200)}...`);
  console.log('\n⚠️  The LLM cannot remember without conversation history!');

  // With memory - using QuasiAgent
  console.log('\n' + '-'.repeat(40));
  console.log('\n✅ WITH MEMORY (QuasiAgent):');

  const agent = new QuasiAgent('You are a helpful assistant.');

  console.log('\n👤 Message 1: "My favorite color is blue."');
  await agent.chat('My favorite color is blue.');

  console.log('\n👤 Message 2: "What is my favorite color?"');
  const withMemoryResponse = await agent.chat('What is my favorite color?');
  console.log(`🤖 Response: ${withMemoryResponse}`);
  console.log('\n✅ The QuasiAgent remembered the previous message!');
}

/**
 * Demonstrates memory manipulation technique.
 */
async function demonstrateMemoryManipulation(): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('Memory Manipulation Demo');
  console.log('='.repeat(60));

  console.log('\nMemory manipulation lets us control what the LLM "sees"');
  console.log('as its previous responses, guiding its behavior.\n');

  const agent = new QuasiAgent(
    'You are a code generator. Output code in markdown code blocks.'
  );

  // Ask for a function
  await agent.chatWithMemoryManipulation(
    'Write a simple hello world function in TypeScript.',

    // Transform: Only store the code block, not any explanation
    (resp) => {
      const code = extractCodeBlock(resp);
      console.log('\n📝 Original response had explanation + code');
      console.log('📝 But we store ONLY the code block in memory:\n');
      console.log(wrapCodeBlock(code));
      return wrapCodeBlock(code);
    }
  );

  console.log('\n💡 Key insight: By manipulating what gets stored in memory,');
  console.log('   we make the LLM think it always outputs just code.');
  console.log('   This influences how it responds to follow-up requests!');

  // Follow up - the LLM will see its "previous response" as just code
  console.log('\n' + '-'.repeat(40));
  console.log('\n👤 Follow-up: "Add a parameter to accept a name"');

  const followUp = await agent.chatWithMemoryManipulation(
    'Add a parameter to accept a name.',
    (response) => wrapCodeBlock(extractCodeBlock(response))
  );

  console.log('\n🤖 Response (extracted code):');
  console.log(extractCodeBlock(followUp));
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Entry Point
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  loadEnv();

  try {
    // Run all demos
    await demonstrateMemoryImportance();
    await demonstrateMemoryManipulation();
    await demonstrateFunctionBuilder();

    console.log('\n' + '='.repeat(60));
    console.log('✅ Quasi-agent examples completed!');
    console.log('='.repeat(60));

    console.log('\n📚 Key Takeaways:');
    console.log('1. Memory (conversation history) is essential for multi-turn interactions');
    console.log('2. Prompt chaining lets us build complex outputs step-by-step');
    console.log('3. Memory manipulation gives us control over LLM behavior');
    console.log('4. These techniques are the foundation for full agents');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}
