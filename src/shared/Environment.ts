/**
 * Agent Environment
 *
 * The Environment is the "E" in GAME (Goals, Actions, Memory, Environment).
 * It represents the world the agent can perceive and affect.
 *
 * Key responsibilities:
 * - Execute actions via the tool registry
 * - Format results with metadata (timestamps, success/error status)
 * - Provide context about the execution environment
 *
 * This matches Python's Environment class in the GAME framework.
 *
 * @example
 * ```typescript
 * const env = new Environment({ workingDirectory: '/path/to/project' });
 * const registry = new ToolRegistry({ tags: ['file_operations'] });
 *
 * const result = await env.executeAction(registry, 'readFile', { fileName: 'package.json' });
 * // Returns: { toolExecuted: true, result: '{ ... }', timestamp: '...' }
 * ```
 */

import { ToolRegistry } from './ToolRegistry';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Result envelope from action execution.
 *
 * This wraps the actual result with metadata about the execution.
 */
export interface ActionResultEnvelope {
  /** Whether the tool executed successfully (vs threw an error) */
  toolExecuted: boolean;

  /** The result of the tool execution (if successful) */
  result?: unknown;

  /** Error message (if failed) */
  error?: string;

  /** Stack trace (if failed and available) */
  traceback?: string;

  /** When the action was executed */
  timestamp: string;
}

/**
 * Configuration for the Environment.
 */
export interface EnvironmentConfig {
  /** Working directory for file operations */
  workingDirectory?: string;

  /** Additional context passed to tools */
  context?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Environment Class
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Represents the environment in which an agent operates.
 *
 * The Environment executes actions and wraps results with metadata.
 * It provides a consistent interface for tool execution across the agent system.
 */
export class Environment {
  /** Working directory for file operations */
  public readonly workingDirectory: string;

  /** Additional context available to tools */
  public readonly context: Record<string, unknown>;

  /**
   * Creates a new Environment.
   *
   * @param config - Environment configuration
   */
  constructor(config: EnvironmentConfig = {}) {
    this.workingDirectory = config.workingDirectory ?? process.cwd();
    this.context = config.context ?? {};
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Action Execution
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Executes an action via the tool registry.
   *
   * This method:
   * 1. Looks up the tool in the registry
   * 2. Validates and executes the tool
   * 3. Wraps the result in an ActionResultEnvelope
   *
   * @param registry - The tool registry containing the action
   * @param name - Name of the tool to execute
   * @param args - Arguments for the tool
   * @returns Result envelope with success/error and metadata
   */
  async executeAction(
    registry: ToolRegistry,
    name: string,
    args: Record<string, unknown>
  ): Promise<ActionResultEnvelope> {
    const timestamp = new Date().toISOString();

    try {
      // Check if tool exists
      if (!registry.has(name)) {
        return {
          toolExecuted: false,
          error: `Unknown tool: ${name}`,
          timestamp,
        };
      }

      // Execute the tool
      const result = await registry.execute(name, args);

      return {
        toolExecuted: true,
        result,
        timestamp,
      };
    } catch (error) {
      // Handle execution errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      const traceback = error instanceof Error ? error.stack : undefined;

      return {
        toolExecuted: false,
        error: errorMessage,
        traceback,
        timestamp,
      };
    }
  }

  /**
   * Executes an action and returns just the result (throws on error).
   *
   * Use this when you want exceptions to propagate rather than
   * being wrapped in an envelope.
   *
   * @param registry - The tool registry
   * @param name - Tool name
   * @param args - Tool arguments
   * @returns The raw result
   * @throws Error if tool not found or execution fails
   */
  async executeActionRaw(
    registry: ToolRegistry,
    name: string,
    args: Record<string, unknown>
  ): Promise<unknown> {
    if (!registry.has(name)) {
      throw new Error(`Unknown tool: ${name}`);
    }
    return registry.execute(name, args);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Result Formatting
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Creates a success result envelope.
   */
  static success(result: unknown): ActionResultEnvelope {
    return {
      toolExecuted: true,
      result,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Creates an error result envelope.
   */
  static error(message: string, traceback?: string): ActionResultEnvelope {
    return {
      toolExecuted: false,
      error: message,
      traceback,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Formats a result envelope as a string for the LLM.
   */
  static formatResult(envelope: ActionResultEnvelope): string {
    return JSON.stringify(envelope);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Environment Info
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Gets information about the current environment.
   */
  getInfo(): Record<string, unknown> {
    return {
      workingDirectory: this.workingDirectory,
      platform: process.platform,
      nodeVersion: process.version,
      ...this.context,
    };
  }

  /**
   * Returns a string representation for debugging.
   */
  toString(): string {
    return `Environment(${this.workingDirectory})`;
  }
}
