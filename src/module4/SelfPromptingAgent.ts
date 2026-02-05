/**
 * Module 4: Zod-Based Tool Registration & Tag Filtering
 *
 * This module introduces the TypeScript-idiomatic approach to tool registration,
 * which is the equivalent of Python's @register_tool decorator pattern.
 *
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │              ZOD-BASED TOOL REGISTRATION                    │
 *   │                                                             │
 *   │   defineTool({                                              │
 *   │     name: 'myTool',                                         │
 *   │     description: 'What it does',                            │
 *   │     schema: z.object({...}),  ← Runtime validation          │
 *   │     tags: ['category'],       ← Tag-based filtering         │
 *   │     terminal: false,          ← Loop control                │
 *   │     execute: async (args) => {...}                          │
 *   │   })                                                        │
 *   │                                                             │
 *   └─────────────────────────────────────────────────────────────┘
 *
 * Key concepts:
 * - **Zod schemas** for type-safe argument validation
 * - **Automatic JSON Schema generation** for OpenAI API
 * - **Tag-based filtering** to create specialized tool sets
 * - **Terminal flags** to control agent loop termination
 * - **Global registry** for tool discovery
 *
 * This is the TypeScript equivalent of Python's:
 *   @register_tool(tags=['file_ops'], terminal=False)
 *   def read_file(file_name: str) -> str:
 *       ...
 *
 * Run with: npm run module4:self-prompting
 */

import { loadEnv } from '../shared/env';
import { z } from 'zod';
import { LLM } from '../shared';
import {
  defineTool,
  getAllGlobalTools,
  getToolNamesByTag,
} from '../shared/defineTool';
import { ToolRegistry } from '../shared/ToolRegistry';
import { AgentBuilder } from '../shared/Agent';
import { FunctionCallingLanguage } from '../shared/AgentLanguage';

// ─────────────────────────────────────────────────────────────────────────────
// Tool Definitions Using Zod
// ─────────────────────────────────────────────────────────────────────────────

/**
 * File Operation Tools
 *
 * These tools are tagged with 'file_operations' and can be filtered
 * to create a file-focused agent.
 */

const listFilesTool = defineTool({
  name: 'listFiles',
  description: 'Lists all files in the current directory',
  schema: z.object({}),
  tags: ['file_operations', 'read'],
  execute: () => {
    const fs = require('fs');
    const files = fs.readdirSync('.');
    console.log(`📁 Listed ${files.length} files`);
    return files;
  },
});

const readFileTool = defineTool({
  name: 'readFile',
  description: 'Reads the contents of a file',
  schema: z.object({
    fileName: z.string().describe('The name of the file to read'),
  }),
  tags: ['file_operations', 'read'],
  execute: ({ fileName }) => {
    const fs = require('fs');
    const content = fs.readFileSync(fileName, 'utf-8');
    console.log(`📄 Read ${content.length} chars from ${fileName}`);
    return content;
  },
});

const writeFileTool = defineTool({
  name: 'writeFile',
  description: 'Writes content to a file',
  schema: z.object({
    fileName: z.string().describe('The name of the file to write'),
    content: z.string().describe('The content to write to the file'),
  }),
  tags: ['file_operations', 'write'],
  execute: ({ fileName, content }) => {
    const fs = require('fs');
    fs.writeFileSync(fileName, content);
    console.log(`✏️  Wrote ${content.length} chars to ${fileName}`);
    return `Successfully wrote to ${fileName}`;
  },
});

/**
 * Analysis Tools
 *
 * These tools are tagged with 'analysis' for analytical tasks.
 */

const countLinesTool = defineTool({
  name: 'countLines',
  description: 'Counts the number of lines in a string',
  schema: z.object({
    text: z.string().describe('The text to count lines in'),
  }),
  tags: ['analysis', 'text'],
  execute: ({ text }) => {
    const lines = text.split('\n').length;
    console.log(`📊 Counted ${lines} lines`);
    return { lines };
  },
});

const findPatternTool = defineTool({
  name: 'findPattern',
  description: 'Finds all occurrences of a pattern in text',
  schema: z.object({
    text: z.string().describe('The text to search'),
    pattern: z.string().describe('The regex pattern to find'),
  }),
  tags: ['analysis', 'text'],
  execute: ({ text, pattern }) => {
    const regex = new RegExp(pattern, 'g');
    const matches = text.match(regex) || [];
    console.log(`🔍 Found ${matches.length} matches for "${pattern}"`);
    return { matches, count: matches.length };
  },
});

/**
 * System Tools
 *
 * These tools control agent behavior.
 */

const terminateTool = defineTool({
  name: 'terminate',
  description: 'Ends the agent session and provides final output',
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

const printMessageTool = defineTool({
  name: 'printMessage',
  description: 'Prints a message to the console',
  schema: z.object({
    message: z.string().describe('The message to print'),
  }),
  tags: ['system', 'output'],
  execute: ({ message }) => {
    console.log(`💬 ${message}`);
    return 'Message printed';
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Demonstrations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Demonstrates the Zod-based tool definition.
 */
function demonstrateToolDefinition(): void {
  console.log('\n' + '='.repeat(60));
  console.log('Zod-Based Tool Definition');
  console.log('='.repeat(60));

  console.log('\nTools are defined using Zod schemas:');
  console.log('```typescript');
  console.log(`const readFileTool = defineTool({
  name: 'readFile',
  description: 'Reads the contents of a file',
  schema: z.object({
    fileName: z.string().describe('The file to read'),
  }),
  tags: ['file_operations', 'read'],
  execute: ({ fileName }) => fs.readFileSync(fileName, 'utf-8'),
});`);
  console.log('```\n');

  console.log('This is equivalent to Python\'s @register_tool decorator:');
  console.log('```python');
  console.log(`@register_tool(tags=['file_operations', 'read'])
def read_file(file_name: str) -> str:
    with open(file_name) as f:
        return f.read()`);
  console.log('```\n');

  console.log('Key benefits:');
  console.log('1. ✅ Type-safe arguments via Zod');
  console.log('2. ✅ Runtime validation');
  console.log('3. ✅ Automatic JSON Schema for OpenAI');
  console.log('4. ✅ Tag-based filtering');
  console.log('5. ✅ Terminal flag for loop control');
}

/**
 * Demonstrates global tool registry.
 */
function demonstrateGlobalRegistry(): void {
  console.log('\n' + '='.repeat(60));
  console.log('Global Tool Registry');
  console.log('='.repeat(60));

  const allTools = getAllGlobalTools();
  console.log(`\n📚 Registered ${allTools.length} tools in global registry:\n`);

  for (const tool of allTools) {
    const tagStr = tool.tags.length > 0 ? `[${tool.tags.join(', ')}]` : '[]';
    const termStr = tool.terminal ? ' (TERMINAL)' : '';
    console.log(`  • ${tool.name}: ${tool.description.substring(0, 40)}...`);
    console.log(`    Tags: ${tagStr}${termStr}`);
  }
}

/**
 * Demonstrates tag-based filtering.
 */
function demonstrateTagFiltering(): void {
  console.log('\n' + '='.repeat(60));
  console.log('Tag-Based Tool Filtering');
  console.log('='.repeat(60));

  console.log('\nTools can be filtered by tags to create specialized agents:\n');

  // Show tools by tag
  const tags = ['file_operations', 'analysis', 'system', 'read', 'write'];

  for (const tag of tags) {
    const toolNames = getToolNamesByTag(tag);
    if (toolNames.length > 0) {
      console.log(`  Tag "${tag}": ${toolNames.join(', ')}`);
    }
  }

  // Demonstrate creating registries with different tags
  console.log('\n📋 Creating specialized registries:\n');

  // Read-only file registry
  const readOnlyRegistry = new ToolRegistry({
    tags: ['read'],
    includeTerminate: true,
  });
  console.log(`  Read-only registry: ${readOnlyRegistry.getNames().join(', ')}`);

  // File operations registry
  const fileOpsRegistry = new ToolRegistry({
    tags: ['file_operations'],
    includeTerminate: true,
  });
  console.log(`  File ops registry: ${fileOpsRegistry.getNames().join(', ')}`);

  // Analysis registry
  const analysisRegistry = new ToolRegistry({
    tags: ['analysis'],
    includeTerminate: true,
  });
  console.log(`  Analysis registry: ${analysisRegistry.getNames().join(', ')}`);

  // Full registry (all tools)
  const fullRegistry = new ToolRegistry();
  console.log(`  Full registry: ${fullRegistry.getNames().join(', ')}`);
}

/**
 * Demonstrates Zod validation.
 */
async function demonstrateZodValidation(): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('Zod Argument Validation');
  console.log('='.repeat(60));

  console.log('\nZod provides runtime validation of tool arguments:\n');

  // Valid arguments
  console.log('✅ Valid arguments:');
  try {
    readFileTool.validate({ fileName: 'package.json' });
    console.log(`   readFile({ fileName: 'package.json' }) → validated`);
  } catch (e) {
    console.log(`   Error: ${e}`);
  }

  // Invalid arguments
  console.log('\n❌ Invalid arguments:');
  try {
    readFileTool.validate({ fileName: 123 });  // Wrong type
    console.log(`   Unexpectedly passed validation`);
  } catch (e: any) {
    console.log(`   readFile({ fileName: 123 }) → ${e.errors?.[0]?.message || e.message}`);
  }

  try {
    readFileTool.validate({});  // Missing required
    console.log(`   Unexpectedly passed validation`);
  } catch (e: any) {
    console.log(`   readFile({}) → ${e.errors?.[0]?.message || e.message}`);
  }

  console.log('\n💡 Validation happens automatically when tools execute!');
}

/**
 * Demonstrates running an agent with tag-filtered tools.
 */
async function demonstrateTagFilteredAgent(llm: LLM): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('Agent with Tag-Filtered Tools');
  console.log('='.repeat(60));

  // Create a read-only file agent
  const readOnlyRegistry = new ToolRegistry({
    tags: ['file_operations', 'system'],
    names: ['listFiles', 'readFile', 'terminate'],  // Explicit list
  });

  console.log(`\n🔧 Agent tools: ${readOnlyRegistry.getNames().join(', ')}`);
  console.log('   (Note: writeFile is excluded by not being in names list)\n');

  const agent = new AgentBuilder()
    .withGoal('explore', 'Read and understand the files in this directory')
    .withLanguage(new FunctionCallingLanguage())
    .withRegistry(readOnlyRegistry)
    .withLLM(llm)
    .verbose()
    .build();

  const memory = await agent.run(
    'List the files and read package.json. Summarize what this project does.'
  );

  console.log(`\n📊 Agent completed with ${memory.length} memory items`);
}

/**
 * Shows the JSON Schema generated from Zod.
 */
function demonstrateJsonSchemaGeneration(): void {
  console.log('\n' + '='.repeat(60));
  console.log('Automatic JSON Schema Generation');
  console.log('='.repeat(60));

  console.log('\nZod schemas are automatically converted to JSON Schema for OpenAI:\n');

  console.log('readFile tool JSON Schema:');
  console.log(JSON.stringify(readFileTool.jsonSchema, null, 2));

  console.log('\nfindPattern tool JSON Schema:');
  console.log(JSON.stringify(findPatternTool.jsonSchema, null, 2));

  console.log('\n💡 This JSON Schema is sent to OpenAI for function calling!');
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Entry Point
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  loadEnv();

  try {
    // Note: Tools are already registered by being defined at module load time
    // This is like Python's @register_tool decorator

    // Run demonstrations
    demonstrateToolDefinition();
    demonstrateGlobalRegistry();
    demonstrateTagFiltering();
    await demonstrateZodValidation();
    demonstrateJsonSchemaGeneration();

    const llm = new LLM();
    await demonstrateTagFilteredAgent(llm);

    console.log('\n' + '='.repeat(60));
    console.log('✅ Zod-Based Tool Registration Demo Complete');
    console.log('='.repeat(60));

    console.log('\n📚 Key Takeaways:');
    console.log('1. defineTool() is the TypeScript equivalent of @register_tool');
    console.log('2. Zod schemas provide type safety AND runtime validation');
    console.log('3. Tags allow creating specialized tool sets for different agents');
    console.log('4. Terminal flags control when the agent loop ends');
    console.log('5. JSON Schema is generated automatically for OpenAI');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().then(() => {
    console.log('\n✅ Module 4 completed successfully');
  }).catch((error) => {
    console.error('❌ Module 4 failed:', error);
    process.exit(1);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

export {
  // Tool instances (already registered globally)
  listFilesTool,
  readFileTool,
  writeFileTool,
  countLinesTool,
  findPatternTool,
  terminateTool,
  printMessageTool,
};

// Re-export core utilities for convenience
export { defineTool } from '../shared/defineTool';
export { ToolRegistry } from '../shared/ToolRegistry';
export type { RegisteredTool, ToolDefinition } from '../shared/defineTool';
