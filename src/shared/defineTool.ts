/**
 * Zod-based Tool Definition
 *
 * This module provides a TypeScript-idiomatic way to define tools using Zod schemas.
 * It's the TypeScript equivalent of Python's @register_tool decorator.
 *
 * Key features:
 * - Type-safe argument validation at runtime
 * - Automatic JSON Schema generation from Zod schemas
 * - Tag-based categorization for filtering
 * - Terminal flag for tools that end the agent loop
 *
 * @example
 * ```typescript
 * import { z } from 'zod';
 * import { defineTool } from '../shared/defineTool';
 *
 * const readFile = defineTool({
 *   name: 'readFile',
 *   description: 'Reads the contents of a file',
 *   schema: z.object({
 *     fileName: z.string().describe('The name of the file to read'),
 *   }),
 *   tags: ['file_operations', 'read'],
 *   execute: async ({ fileName }) => {
 *     return fs.readFileSync(fileName, 'utf-8');
 *   },
 * });
 * ```
 */

import { z, ZodObject } from 'zod';
import zodToJsonSchema from 'zod-to-json-schema';
import { Tool, ToolParameters } from './Tool';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Configuration for defining a tool with Zod schema.
 *
 * @template TSchema - Zod object schema defining the tool's parameters
 */
export interface ToolDefinition<TSchema extends ZodObject<any>> {
  /** Unique identifier for the tool */
  name: string;

  /** Human-readable description (shown to the LLM) */
  description: string;

  /** Zod schema defining the expected arguments */
  schema: TSchema;

  /** Tags for categorization and filtering */
  tags?: string[];

  /** If true, calling this tool ends the agent loop */
  terminal?: boolean;

  /** Function to execute when the tool is called */
  execute: (args: z.infer<TSchema>) => unknown | Promise<unknown>;
}

/**
 * A registered tool with both definition and runtime capabilities.
 *
 * @template TSchema - Zod object schema defining the tool's parameters
 */
export interface RegisteredTool<TSchema extends ZodObject<any>> {
  /** Tool name */
  name: string;

  /** Tool description */
  description: string;

  /** Original Zod schema */
  schema: TSchema;

  /** Tags for categorization */
  tags: string[];

  /** Whether this tool terminates the agent loop */
  terminal: boolean;

  /** The Tool object (for OpenAI API) */
  tool: Tool;

  /** JSON Schema representation of parameters */
  jsonSchema: ToolParameters;

  /**
   * Validates arguments against the schema.
   * @throws ZodError if validation fails
   */
  validate: (args: unknown) => z.infer<TSchema>;

  /**
   * Executes the tool with validated arguments.
   */
  execute: (args: z.infer<TSchema>) => unknown | Promise<unknown>;

  /**
   * Validates and executes in one call.
   * @throws ZodError if validation fails
   */
  run: (args: unknown) => Promise<unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Global Registry
// ─────────────────────────────────────────────────────────────────────────────

/** Global registry of all defined tools */
const globalTools: Map<string, RegisteredTool<any>> = new Map();

/** Index of tools by tag for efficient filtering */
const toolsByTag: Map<string, Set<string>> = new Map();

/**
 * Gets a tool from the global registry.
 */
export function getGlobalTool(name: string): RegisteredTool<any> | undefined {
  return globalTools.get(name);
}

/**
 * Gets all tools from the global registry.
 */
export function getAllGlobalTools(): RegisteredTool<any>[] {
  return Array.from(globalTools.values());
}

/**
 * Gets all tool names that have a specific tag.
 */
export function getToolNamesByTag(tag: string): string[] {
  return Array.from(toolsByTag.get(tag) ?? []);
}

/**
 * Clears the global registry. Useful for testing.
 */
export function clearGlobalRegistry(): void {
  globalTools.clear();
  toolsByTag.clear();
}

// ─────────────────────────────────────────────────────────────────────────────
// Schema Conversion
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts a Zod schema to OpenAI-compatible JSON Schema.
 *
 * This uses the zod-to-json-schema library for robust conversion,
 * then transforms the output to match OpenAI's expected format.
 */
function zodSchemaToToolParameters(schema: ZodObject<any>): ToolParameters {
  // Convert using zod-to-json-schema
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jsonSchema = zodToJsonSchema(schema as any, {
    target: 'openApi3',
    $refStrategy: 'none',
  }) as Record<string, unknown>;

  // Extract just what we need for OpenAI
  const result: ToolParameters = {
    type: 'object',
    properties: {},
  };

  // Copy properties
  if (jsonSchema.properties && typeof jsonSchema.properties === 'object') {
    result.properties = jsonSchema.properties as ToolParameters['properties'];
  }

  // Copy required array
  if (Array.isArray(jsonSchema.required) && jsonSchema.required.length > 0) {
    result.required = jsonSchema.required as string[];
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Defines a tool with Zod schema validation.
 *
 * This is the TypeScript equivalent of Python's @register_tool decorator.
 * It automatically:
 * - Generates JSON Schema from the Zod schema
 * - Creates an OpenAI-compatible Tool object
 * - Registers the tool in the global registry
 * - Provides runtime validation via Zod
 *
 * @param definition - Tool configuration including name, description, schema, and execute function
 * @returns A registered tool with validation and execution capabilities
 *
 * @example
 * ```typescript
 * const readFile = defineTool({
 *   name: 'readFile',
 *   description: 'Reads a file',
 *   schema: z.object({
 *     fileName: z.string().describe('File to read'),
 *   }),
 *   tags: ['file_operations'],
 *   execute: async ({ fileName }) => fs.readFileSync(fileName, 'utf-8'),
 * });
 *
 * // Use it
 * const result = await readFile.run({ fileName: 'package.json' });
 * ```
 */
export function defineTool<TSchema extends ZodObject<any>>(
  definition: ToolDefinition<TSchema>
): RegisteredTool<TSchema> {
  const { name, description, schema, tags = [], terminal = false, execute } = definition;

  // Convert Zod schema to JSON Schema
  const jsonSchema = zodSchemaToToolParameters(schema);

  // Create the Tool object for OpenAI API
  const tool = new Tool(name, description, jsonSchema);

  // Create the registered tool
  const registeredTool: RegisteredTool<TSchema> = {
    name,
    description,
    schema,
    tags,
    terminal,
    tool,
    jsonSchema,

    validate: (args: unknown) => schema.parse(args),

    execute,

    run: async (args: unknown) => {
      const validated = schema.parse(args);
      return execute(validated);
    },
  };

  // Register globally
  globalTools.set(name, registeredTool);

  // Index by tags
  for (const tag of tags) {
    if (!toolsByTag.has(tag)) {
      toolsByTag.set(tag, new Set());
    }
    toolsByTag.get(tag)!.add(name);
  }

  return registeredTool;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pre-defined Common Tools
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a standard listFiles tool definition.
 * Note: This is a factory that returns a definition, not a registered tool.
 * Call defineTool() with the result to register it.
 */
export function listFilesDefinition(
  execute: () => string[] | Promise<string[]>
): ToolDefinition<ZodObject<{}>> {
  return {
    name: 'listFiles',
    description: 'Lists all files in the current directory',
    schema: z.object({}),
    tags: ['file_operations', 'list'],
    execute,
  };
}

/**
 * Creates a standard readFile tool definition.
 */
export function readFileDefinition(
  execute: (args: { fileName: string }) => string | Promise<string>
): ToolDefinition<ZodObject<{ fileName: z.ZodString }>> {
  return {
    name: 'readFile',
    description: 'Reads the contents of a file',
    schema: z.object({
      fileName: z.string().describe('The name of the file to read'),
    }),
    tags: ['file_operations', 'read'],
    execute,
  };
}

/**
 * Creates a standard terminate tool definition.
 */
export function terminateDefinition(
  execute: (args: { message: string }) => string | Promise<string> = ({ message }) => message
): ToolDefinition<ZodObject<{ message: z.ZodString }>> {
  return {
    name: 'terminate',
    description: 'Ends the conversation and provides final output to the user',
    schema: z.object({
      message: z.string().describe('Final message to display to the user'),
    }),
    tags: ['system'],
    terminal: true,
    execute,
  };
}
