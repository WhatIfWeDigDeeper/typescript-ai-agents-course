/**
 * Module 2: Function Calling
 *
 * This module demonstrates OpenAI's function calling feature, which provides
 * a structured way for LLMs to invoke tools.
 *
 * Why function calling is better than text parsing:
 * 1. **Reliability**: The LLM outputs structured JSON, not free-form text
 * 2. **Type Safety**: Arguments are validated against a schema
 * 3. **No Parsing Errors**: No need to extract actions from markdown blocks
 * 4. **Better Tool Understanding**: LLM sees the schema, not just descriptions
 *
 * Run with: npm run module2:function-calling
 */

import { loadEnv } from '../shared/env';
import { Message, LLM, Tool, Prompt, Action } from '../shared';

/**
 * Simple demonstration of function calling.
 *
 * We define tools with JSON schemas, and the LLM responds with
 * structured tool calls instead of free-form text.
 */
async function basicFunctionCalling(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Module 2: Function Calling Basics');
  console.log('='.repeat(60));

  const llm = new LLM();

  // Define available tools
  const tools = [
    new Tool(
      'getCurrentWeather',
      'Get the current weather in a given location',
      {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'The city and state, e.g. San Francisco, CA',
          },
          unit: {
            type: 'string',
            enum: ['celsius', 'fahrenheit'],
            description: 'Temperature unit',
          },
        },
        required: ['location'],
      }
    ),
    new Tool(
      'searchWeb',
      'Search the web for information',
      {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query',
          },
        },
        required: ['query'],
      }
    ),
  ];

  // Create a prompt with tools
  const prompt = new Prompt(
    [
      Message.system('You are a helpful assistant. Use tools when appropriate.'),
      Message.user("What's the weather like in Tokyo?"),
    ],
    tools
  );

  console.log('\n📤 Sending prompt with tools...');
  console.log('   Tools:', tools.map(t => t.name).join(', '));

  const response = await llm.generate(prompt);
  console.log('\n📥 Raw response:', response);

  // Parse the function call
  try {
    const action = Action.fromJSON(JSON.parse(response));
    console.log('\n✅ Parsed function call:');
    console.log('   Tool:', action.toolName);
    console.log('   Args:', JSON.stringify(action.args, null, 2));
  } catch {
    console.log('\n📝 LLM responded with text (no function call)');
  }
}

/**
 * Demonstrates how the LLM chooses between multiple tools.
 */
async function toolSelection(): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('Tool Selection Demo');
  console.log('='.repeat(60));

  const llm = new LLM();

  const tools = [
    Tool.listFiles('Lists all files in the current directory'),
    Tool.readFile('Reads the contents of a specific file'),
    new Tool(
      'writeFile',
      'Writes content to a file',
      {
        type: 'object',
        properties: {
          fileName: { type: 'string', description: 'Name of the file to write' },
          content: { type: 'string', description: 'Content to write' },
        },
        required: ['fileName', 'content'],
      }
    ),
    Tool.terminate('Ends the conversation with a summary'),
  ];

  // Different requests should trigger different tools
  const requests = [
    'What files are available?',
    'Can you read the package.json file?',
    'I\'m done, thanks for your help!',
  ];

  for (const request of requests) {
    console.log(`\n👤 User: "${request}"`);

    const prompt = new Prompt(
      [
        Message.system('You are a file assistant. Use the appropriate tool for each request.'),
        Message.user(request),
      ],
      tools
    );

    const response = await llm.generate(prompt);

    try {
      const action = Action.fromJSON(JSON.parse(response));
      console.log(`🔧 Selected tool: ${action.toolName}`);
      console.log(`   Arguments: ${JSON.stringify(action.args)}`);
    } catch {
      console.log(`📝 Text response: ${response.substring(0, 100)}...`);
    }

    console.log('─'.repeat(40));
  }
}

/**
 * Shows the difference between function calling and text parsing.
 */
async function comparisonDemo(): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('Comparison: Function Calling vs Text Parsing');
  console.log('='.repeat(60));

  const llm = new LLM();

  // Same request, but one uses function calling and one doesn't
  const userRequest = 'Read the file named "test.txt"';

  // Method 1: Text-based (must parse markdown)
  console.log('\n📋 Method 1: Text-based response');
  console.log('─'.repeat(40));

  const textPrompt = new Prompt([
    Message.system(
      'When asked to perform an action, respond with a JSON code block:\n' +
      '```action\n{"tool": "readFile", "args": {"fileName": "..."}}\n```'
    ),
    Message.user(userRequest),
  ]);

  const textResponse = await llm.generate(textPrompt);
  console.log('Response:\n', textResponse);
  console.log('\n⚠️  Requires parsing markdown blocks, can fail');

  // Method 2: Function calling (structured)
  console.log('\n📋 Method 2: Function calling');
  console.log('─'.repeat(40));

  const fcPrompt = new Prompt(
    [
      Message.system('You are a file assistant.'),
      Message.user(userRequest),
    ],
    [Tool.readFile()]
  );

  const fcResponse = await llm.generate(fcPrompt);
  console.log('Response:', fcResponse);

  const action = Action.fromJSON(JSON.parse(fcResponse));
  console.log('\n✅ Structured output:');
  console.log('   Tool:', action.toolName);
  console.log('   Args:', action.args);
  console.log('\n✅ No parsing needed, guaranteed structure');
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Entry Point
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  loadEnv();

  try {
    await basicFunctionCalling();
    await toolSelection();
    await comparisonDemo();

    console.log('\n✅ Function calling examples completed!');
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

export { basicFunctionCalling, toolSelection };
