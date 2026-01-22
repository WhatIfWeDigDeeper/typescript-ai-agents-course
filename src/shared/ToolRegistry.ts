/**
 * Tag-Based Tool Registry
 *
 * This module provides a registry for managing tools with tag-based filtering.
 * It's the TypeScript equivalent of Python's PythonActionRegistry.
 *
 * Key features:
 * - Load tools from the global registry by tags or names
 * - Execute tools with validation
 * - Get Tool objects for OpenAI API
 *
 * @example
 * ```typescript
 * // Define tools (they auto-register globally)
 * const readFile = defineTool({ ..., tags: ['file_operations'] });
 * const terminate = defineTool({ ..., tags: ['system'], terminal: true });
 *
 * // Create a registry with only specific tags
 * const registry = new ToolRegistry({
 *   tags: ['file_operations', 'system']
 * });
 *
 * // Use the registry
 * const tools = registry.getTools();  // For OpenAI API
 * const result = await registry.execute('readFile', { fileName: 'test.txt' });
 * ```
 */

import { Tool } from './Tool';
import {
  RegisteredTool,
  getAllGlobalTools,
} from './defineTool';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ToolRegistryOptions {
  /** Only include tools with at least one of these tags */
  tags?: string[];

  /** Only include tools with these specific names */
  names?: string[];

  /** If true, always include the terminate tool (default: false) */
  includeTerminate?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// ToolRegistry Class
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A registry of tools filtered by tags or names.
 *
 * This is the TypeScript equivalent of Python's PythonActionRegistry.
 * It filters tools from the global registry based on tags or explicit names.
 */
export class ToolRegistry {
  private readonly tools: Map<string, RegisteredTool<any>> = new Map();

  /**
   * Creates a new ToolRegistry.
   *
   * @param options - Filtering options
   * @param options.tags - Only include tools with at least one of these tags
   * @param options.names - Only include tools with these specific names
   * @param options.includeTerminate - Always include terminate tool if available
   */
  constructor(options: ToolRegistryOptions = {}) {
    const { tags, names, includeTerminate = false } = options;

    // Get all global tools
    const allTools = getAllGlobalTools();

    for (const tool of allTools) {
      // Check if tool should be included
      let include = false;

      // If names specified, check name
      if (names && names.length > 0) {
        if (names.includes(tool.name)) {
          include = true;
        }
      }

      // If tags specified, check tags
      if (tags && tags.length > 0) {
        const hasMatchingTag = tool.tags.some(t => tags.includes(t));
        if (hasMatchingTag) {
          include = true;
        }
      }

      // If neither specified, include all
      if (!names && !tags) {
        include = true;
      }

      // Special handling for terminate
      if (includeTerminate && tool.name === 'terminate') {
        include = true;
      }

      if (include) {
        this.tools.set(tool.name, tool);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Registration
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Manually registers a tool in this registry.
   * This bypasses tag filtering.
   */
  register(tool: RegisteredTool<any>): this {
    this.tools.set(tool.name, tool);
    return this;
  }

  /**
   * Unregisters a tool from this registry.
   */
  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Lookup
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Gets a registered tool by name.
   */
  get(name: string): RegisteredTool<any> | undefined {
    return this.tools.get(name);
  }

  /**
   * Checks if a tool is registered.
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Gets all registered tools.
   */
  getAll(): RegisteredTool<any>[] {
    return Array.from(this.tools.values());
  }

  /**
   * Gets all tool names.
   */
  getNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Gets Tool objects for the OpenAI API.
   * This returns an array of Tool objects suitable for passing to the LLM.
   */
  getTools(): Tool[] {
    return this.getAll().map(t => t.tool);
  }

  /**
   * Gets the number of registered tools.
   */
  get size(): number {
    return this.tools.size;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Execution
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Validates arguments for a tool.
   *
   * @param name - Tool name
   * @param args - Arguments to validate
   * @returns Validated arguments
   * @throws Error if tool not found or validation fails
   */
  validate(name: string, args: unknown): unknown {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }
    return tool.validate(args);
  }

  /**
   * Executes a tool with validation.
   *
   * @param name - Tool name
   * @param args - Arguments (will be validated)
   * @returns Tool execution result
   * @throws Error if tool not found or validation fails
   */
  async execute(name: string, args: unknown): Promise<unknown> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }
    return tool.run(args);
  }

  /**
   * Checks if a tool is terminal (ends the agent loop).
   */
  isTerminal(name: string): boolean {
    const tool = this.tools.get(name);
    return tool?.terminal ?? false;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Utility
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Creates a string representation for debugging.
   */
  toString(): string {
    const names = this.getNames().join(', ');
    return `ToolRegistry(${this.size} tools: ${names})`;
  }

  /**
   * Returns tool information for debugging.
   */
  describe(): { name: string; description: string; tags: string[]; terminal: boolean }[] {
    return this.getAll().map(t => ({
      name: t.name,
      description: t.description,
      tags: t.tags,
      terminal: t.terminal,
    }));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a ToolRegistry with file operation tools.
 * Includes: listFiles, readFile, terminate
 */
export function createFileOperationsRegistry(): ToolRegistry {
  return new ToolRegistry({
    tags: ['file_operations', 'system'],
    includeTerminate: true,
  });
}

/**
 * Creates a ToolRegistry with all registered tools.
 */
export function createFullRegistry(): ToolRegistry {
  return new ToolRegistry();
}
