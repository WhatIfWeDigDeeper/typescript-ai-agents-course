/**
 * Module 3: The GAME Framework with Agent Languages
 *
 * GAME is a structured approach to designing AI agents:
 *
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │                    THE GAME FRAMEWORK                       │
 *   │                                                             │
 *   │   G - Goals      What the agent is trying to achieve        │
 *   │   A - Actions    Tools available to the agent               │
 *   │   M - Memory     Context and state storage                  │
 *   │   E - Environment The world the agent operates in           │
 *   │                                                             │
 *   └─────────────────────────────────────────────────────────────┘
 *
 * This module introduces the **AgentLanguage** abstraction, which controls
 * how an agent communicates with an LLM:
 *
 * - **NaturalLanguage**: Simple Q&A, terminates on any response
 * - **JsonActionLanguage**: Text-based ```action block parsing
 * - **FunctionCallingLanguage**: OpenAI native function calling
 *
 * The same GAME components (Goals, Actions, Memory, Environment) work
 * with ANY language implementation. This demonstrates the power of
 * separating "what the agent does" from "how it communicates".
 *
 * Run with: npm run module3:game
 */

import { loadEnv } from '../shared/env';
import { LLM } from '../shared';
import {
  Agent,
  AgentBuilder,
} from '../shared/Agent';
import {
  AgentLanguage,
  Goal,
  NaturalLanguage,
  JsonActionLanguage,
  FunctionCallingLanguage,
  createGoal,
} from '../shared/AgentLanguage';
import { ConversationMemory } from '../shared/ConversationMemory';
import { Environment } from '../shared/Environment';
import { ToolRegistry } from '../shared/ToolRegistry';
import { defineTool, clearGlobalRegistry } from '../shared/defineTool';
import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Tool Definitions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Registers the file operation tools.
 *
 * These tools use the Zod-based definition pattern introduced in Module 4,
 * but demonstrated here to show how the GAME framework integrates.
 */
function registerFileTools(): void {
  const fs = require('fs');

  // List files tool
  defineTool({
    name: 'listFiles',
    description: 'Lists all files in the current directory',
    schema: z.object({}),
    tags: ['file_operations'],
    execute: () => {
      const files = fs.readdirSync('.');
      console.log(`📁 Found ${files.length} files`);
      return files;
    },
  });

  // Read file tool
  defineTool({
    name: 'readFile',
    description: 'Reads the contents of a file',
    schema: z.object({
      fileName: z.string().describe('The name of the file to read'),
    }),
    tags: ['file_operations'],
    execute: ({ fileName }) => {
      const content = fs.readFileSync(fileName, 'utf-8');
      console.log(`📄 Read ${content.length} characters from ${fileName}`);
      return content;
    },
  });

  // Terminate tool
  defineTool({
    name: 'terminate',
    description: 'Ends the session and provides final output to the user',
    schema: z.object({
      message: z.string().describe('Final message to display'),
    }),
    tags: ['system'],
    terminal: true,
    execute: ({ message }) => {
      console.log(`✅ ${message}`);
      return message;
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// GAME Agent Factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a GAME agent with the specified language.
 *
 * This demonstrates how the SAME Goals, Actions, Memory, and Environment
 * can be used with DIFFERENT languages (communication strategies).
 *
 * @param language - How the agent communicates with the LLM
 * @param goals - What the agent is trying to achieve
 * @param llm - The LLM to use
 */
function createGAMEAgent(
  language: AgentLanguage,
  goals: Goal[],
  llm: LLM
): Agent {
  // Create a registry with file operations and system tools
  const registry = new ToolRegistry({
    tags: ['file_operations', 'system'],
  });

  // Create the agent using the builder pattern
  return new AgentBuilder()
    .withGoals(goals)
    .withLanguage(language)
    .withRegistry(registry)
    .withLLM(llm)
    .withEnvironment(new Environment())
    .verbose()
    .build();
}

// ─────────────────────────────────────────────────────────────────────────────
// Demo Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Demonstrates the GAME framework with FunctionCallingLanguage.
 *
 * This is the most common approach when using OpenAI models.
 */
async function demonstrateFunctionCalling(llm: LLM): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('GAME Agent with FunctionCallingLanguage');
  console.log('='.repeat(60));

  console.log('\nThis uses OpenAI\'s native function calling API.');
  console.log('The LLM receives tools as structured definitions and');
  console.log('returns tool calls in a structured format.\n');

  const goals: Goal[] = [
    createGoal('discover', 'Find out what files exist in the directory', 10),
    createGoal('analyze', 'Read and understand the package.json file', 8),
    createGoal('summarize', 'Provide a summary of the project', 5),
  ];

  const agent = createGAMEAgent(
    new FunctionCallingLanguage(),
    goals,
    llm
  );

  console.log('🎯 GOALS:');
  goals.forEach(g => console.log(`   [${g.priority}] ${g.name}: ${g.description}`));

  const memory = await agent.run(
    'Analyze this project. List the files, read package.json, and summarize.'
  );

  console.log('\n📊 Final memory:', memory.length, 'items');
}

/**
 * Demonstrates the GAME framework with JsonActionLanguage.
 *
 * This works with ANY LLM by parsing text responses.
 */
async function demonstrateJsonAction(llm: LLM): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('GAME Agent with JsonActionLanguage');
  console.log('='.repeat(60));

  console.log('\nThis parses ```action blocks from text responses.');
  console.log('It works with ANY LLM, even those without function calling.\n');

  const goals: Goal[] = [
    createGoal('explore', 'Discover what files are available', 10),
    createGoal('report', 'Provide a brief report on the directory contents', 5),
  ];

  const agent = createGAMEAgent(
    new JsonActionLanguage(),
    goals,
    llm
  );

  console.log('🎯 GOALS:');
  goals.forEach(g => console.log(`   [${g.priority}] ${g.name}: ${g.description}`));

  const memory = await agent.run(
    'What files are in this directory? Give me a quick summary.'
  );

  console.log('\n📊 Final memory:', memory.length, 'items');
}

/**
 * Demonstrates the GAME framework with NaturalLanguage.
 *
 * This is for simple Q&A without tool calling.
 */
async function demonstrateNaturalLanguage(llm: LLM): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('GAME Agent with NaturalLanguage');
  console.log('='.repeat(60));

  console.log('\nThis is the simplest language - pure conversation.');
  console.log('Any response terminates immediately (no tool calling).\n');

  const goals: Goal[] = [
    createGoal('assist', 'Help the user with their question', 10),
  ];

  // For NaturalLanguage, we don't need tools
  const agent = new AgentBuilder()
    .withGoals(goals)
    .withLanguage(new NaturalLanguage())
    .withRegistry(new ToolRegistry())  // Empty registry
    .withLLM(llm)
    .verbose()
    .build();

  console.log('🎯 GOALS:');
  goals.forEach(g => console.log(`   [${g.priority}] ${g.name}: ${g.description}`));

  const memory = await agent.run(
    'What is the GAME framework in AI agent design?'
  );

  console.log('\n📊 Final memory:', memory.length, 'items');
}

/**
 * Shows how the same goals work with different languages.
 */
async function demonstrateLanguageComparison(_llm: LLM): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('Language Comparison');
  console.log('='.repeat(60));

  console.log('\nThe GAME framework separates WHAT an agent does from');
  console.log('HOW it communicates. The same goals and tools can use');
  console.log('different languages:\n');

  console.log('┌─────────────────────────────────────────────────────────┐');
  console.log('│ Language             │ Best For                        │');
  console.log('├─────────────────────────────────────────────────────────┤');
  console.log('│ NaturalLanguage      │ Simple Q&A, no tools            │');
  console.log('│ JsonActionLanguage   │ Any LLM, text parsing           │');
  console.log('│ FunctionCallingLang  │ OpenAI models, structured calls │');
  console.log('└─────────────────────────────────────────────────────────┘');

  console.log('\n📚 Key Takeaways:');
  console.log('1. GAME components (G, A, M, E) are independent of language');
  console.log('2. Language controls prompt construction and response parsing');
  console.log('3. You can swap languages without changing agent logic');
  console.log('4. FunctionCalling is most reliable, JsonAction is most portable');
}

// ─────────────────────────────────────────────────────────────────────────────
// Simple GAME Agent Class (for backwards compatibility)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A simple GAME Agent implementation for direct use.
 *
 * This class provides a more explicit interface to the GAME components,
 * wrapping the core Agent class with convenient methods.
 */
export class GAMEAgent {
  private goals: Goal[] = [];
  private readonly registry: ToolRegistry;
  private readonly memory: ConversationMemory;
  private readonly environment: Environment;
  private readonly llm: LLM;
  private language: AgentLanguage;

  constructor(config: {
    language?: AgentLanguage;
    maxIterations?: number;
    model?: string;
    workingDirectory?: string;
  } = {}) {
    this.llm = new LLM({ model: config.model });
    this.language = config.language ?? new FunctionCallingLanguage();
    this.registry = new ToolRegistry();
    this.memory = new ConversationMemory();
    this.environment = new Environment({
      workingDirectory: config.workingDirectory,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GAME Component Access
  // ─────────────────────────────────────────────────────────────────────────────

  /** G - Goals: Add a goal for the agent to pursue */
  addGoal(name: string, description: string, priority = 0): this {
    this.goals.push(createGoal(name, description, priority));
    return this;
  }

  /** A - Actions: The registry contains all available actions */
  getRegistry(): ToolRegistry {
    return this.registry;
  }

  /** M - Memory: Get the conversation memory */
  getMemory(): ConversationMemory {
    return this.memory;
  }

  /** E - Environment: Get the environment */
  getEnvironment(): Environment {
    return this.environment;
  }

  /** Set the language (communication strategy) */
  setLanguage(language: AgentLanguage): this {
    this.language = language;
    return this;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Execution
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Runs the agent to achieve its goals.
   */
  async run(initialContext?: string): Promise<ConversationMemory> {
    console.log('\n' + '='.repeat(60));
    console.log('GAME Agent Starting');
    console.log('='.repeat(60));

    console.log('\n🎯 GOALS:');
    this.goals.forEach(g => console.log(`   [${g.priority}] ${g.name}: ${g.description}`));

    console.log('\n🔧 ACTIONS:', this.registry.getNames().join(', '));
    console.log('🌍 ENVIRONMENT:', this.environment.workingDirectory);
    console.log('💬 LANGUAGE:', this.language.constructor.name);

    // Create and run the core agent
    const agent = new AgentBuilder()
      .withGoals(this.goals)
      .withLanguage(this.language)
      .withRegistry(this.registry)
      .withLLM(this.llm)
      .withEnvironment(this.environment)
      .verbose()
      .build();

    const userInput = initialContext ?? 'Begin working on the goals.';
    return agent.run(userInput, this.memory);
  }
}

/**
 * Creates a file analysis agent with predefined goals.
 */
export function createFileAnalysisAgent(): GAMEAgent {
  // Register tools in global registry
  registerFileTools();

  const agent = new GAMEAgent();

  // Add goals
  agent
    .addGoal('discover', 'Find out what files exist in the directory', 10)
    .addGoal('analyze', 'Read and understand the package.json file', 8)
    .addGoal('summarize', 'Provide a summary of the project', 5);

  // The registry will pick up the globally registered tools
  return agent;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Entry Point
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  loadEnv();

  try {
    // Clear any previous tool registrations
    clearGlobalRegistry();

    // Register our tools
    registerFileTools();

    const llm = new LLM();

    // Run the demos
    await demonstrateFunctionCalling(llm);
    await demonstrateJsonAction(llm);
    await demonstrateNaturalLanguage(llm);
    await demonstrateLanguageComparison(llm);

    console.log('\n' + '='.repeat(60));
    console.log('✅ GAME Framework Demo Complete');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

// Export for module use
export { createGAMEAgent, registerFileTools };
