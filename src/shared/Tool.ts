/**
 * Represents a tool that an AI agent can use.
 *
 * Tools are defined using JSON Schema for their parameters, which allows
 * the LLM to understand what arguments are expected and generate valid calls.
 *
 * @example
 * ```typescript
 * // Create a tool manually
 * const readFileTool = new Tool(
 *   "readFile",
 *   "Reads the contents of a file",
 *   {
 *     type: "object",
 *     properties: {
 *       path: { type: "string", description: "Path to the file" }
 *     },
 *     required: ["path"]
 *   }
 * );
 *
 * // Or use factory methods
 * const listTool = Tool.listFiles();
 * const readTool = Tool.readFile();
 * const terminateTool = Tool.terminate();
 * ```
 */

/** JSON Schema for tool parameters - compatible with OpenAI's FunctionParameters */
export interface ToolParameters {
  type: 'object';
  properties: Record<string, {
    type: string;
    description?: string;
    enum?: string[];
  }>;
  required?: string[];
  [key: string]: unknown;  // Index signature for OpenAI compatibility
}

export class Tool {
  /**
   * Creates a new Tool.
   * @param name - Unique identifier for the tool
   * @param description - Human-readable description (shown to LLM)
   * @param parameters - JSON Schema defining expected arguments
   * @param terminal - If true, calling this tool ends the agent loop
   * @param tags - Tags for categorization and filtering
   */
  constructor(
    public readonly name: string,
    public readonly description: string,
    public readonly parameters: ToolParameters = { type: 'object', properties: {} },
    public readonly terminal: boolean = false,
    public readonly tags: string[] = []
  ) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // Factory Methods - Common Tools
  // ─────────────────────────────────────────────────────────────────────────────

  /** Creates a tool for listing files in a directory */
  static listFiles(description = 'Lists all files in the current directory'): Tool {
    return new Tool('listFiles', description, {
      type: 'object',
      properties: {},
      required: [],
    });
  }

  /** Creates a tool for reading file contents */
  static readFile(description = 'Reads the contents of a file'): Tool {
    return new Tool('readFile', description, {
      type: 'object',
      properties: {
        fileName: {
          type: 'string',
          description: 'The name of the file to read',
        },
      },
      required: ['fileName'],
    });
  }

  /** Creates a termination tool to end the agent loop */
  static terminate(description = 'Ends the conversation and provides final output to user'): Tool {
    return new Tool('terminate', description, {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'Final message to display to the user',
        },
      },
      required: ['message'],
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Serialization
  // ─────────────────────────────────────────────────────────────────────────────

  /** Converts to a plain object for JSON serialization */
  toJSON(): { name: string; description: string; parameters: ToolParameters } {
    return {
      name: this.name,
      description: this.description,
      parameters: this.parameters,
    };
  }

  /**
   * Creates a Tool from a JSON object.
   * Accepts both { name, ... } and { toolName, ... } formats.
   */
  static fromJSON(json: {
    name?: string;
    toolName?: string;
    description: string;
    parameters?: ToolParameters;
  }): Tool {
    const name = json.name ?? json.toolName;
    if (!name) {
      throw new Error('Tool JSON must have "name" or "toolName" field');
    }
    return new Tool(
      name,
      json.description,
      json.parameters ?? { type: 'object', properties: {} }
    );
  }

  /**
   * Creates a Tool from a JSON string.
   * @param jsonString - JSON string containing tool definition
   */
  static parse(jsonString: string): Tool {
    const json = JSON.parse(jsonString);
    return Tool.fromJSON(json);
  }

  /** String representation for debugging */
  toString(): string {
    return `Tool(${this.name}: ${this.description})`;
  }
}
