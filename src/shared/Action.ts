/**
 * Represents an action (tool invocation) that an AI agent wants to perform.
 *
 * Actions are parsed from LLM responses and contain:
 * - The name of the tool to invoke
 * - Arguments to pass to that tool
 *
 * @example
 * ```typescript
 * // Parse from LLM response
 * const action = Action.fromJSON({ tool: "readFile", args: { path: "readme.md" } });
 *
 * // Access arguments with type safety
 * const path = action.getArg<string>("path"); // "readme.md"
 *
 * // Create special actions
 * const done = Action.terminate("Task completed successfully");
 * const err = Action.error("Something went wrong");
 * ```
 */

/** Arguments passed to a tool - a record of string keys to unknown values */
export type ToolArgs = Record<string, unknown>;

export class Action {
  /**
   * Creates a new Action.
   * @param toolName - The name of the tool to invoke
   * @param args - Arguments to pass to the tool
   */
  constructor(
    public readonly toolName: string,
    public readonly args: ToolArgs = {}
  ) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // Argument Access
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Gets a specific argument by name with type assertion.
   *
   * Note: This performs a type assertion, not runtime validation.
   * For runtime safety, provide a validator function.
   *
   * @param name - The argument name
   * @param validator - Optional runtime type validator
   * @returns The argument value or undefined if not present
   *
   * @example
   * ```typescript
   * // Simple usage (type assertion only)
   * const count = action.getArg<number>("count");
   *
   * // With runtime validation
   * const count = action.getArg("count", (v): v is number => typeof v === "number");
   * ```
   */
  getArg<T>(name: string, validator?: (value: unknown) => value is T): T | undefined {
    const value = this.args[name];
    if (value === undefined) return undefined;

    if (validator) {
      return validator(value) ? value : undefined;
    }

    return value as T;
  }

  /**
   * Gets a required argument, throwing if not present.
   * @throws Error if argument is missing
   */
  requireArg<T>(name: string, validator?: (value: unknown) => value is T): T {
    const value = this.getArg<T>(name, validator);
    if (value === undefined) {
      throw new Error(`Missing required argument: ${name}`);
    }
    return value;
  }

  /**
   * Checks if this action is a termination action.
   */
  isTerminate(): boolean {
    return this.toolName === 'terminate';
  }

  /**
   * Checks if this action is an error action.
   */
  isError(): boolean {
    return this.toolName === 'error';
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Factory Methods
  // ─────────────────────────────────────────────────────────────────────────────

  /** Creates a termination action */
  static terminate(message: string): Action {
    return new Action('terminate', { message });
  }

  /** Creates an error action */
  static error(message: string): Action {
    return new Action('error', { message });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Serialization
  // ─────────────────────────────────────────────────────────────────────────────

  /** Converts to a plain object */
  toJSON(): { tool: string; args: ToolArgs } {
    return { tool: this.toolName, args: this.args };
  }

  /**
   * Creates an Action from a JSON object.
   * Accepts both { tool, args } and { toolName, args } formats.
   */
  static fromJSON(json: { tool?: string; toolName?: string; args?: ToolArgs }): Action {
    const toolName = json.tool ?? json.toolName;
    if (!toolName) {
      throw new Error('Action JSON must have "tool" or "toolName" field');
    }
    return new Action(toolName, json.args ?? {});
  }

  /** String representation for debugging */
  toString(): string {
    return `Action(${this.toolName}, ${JSON.stringify(this.args)})`;
  }
}
