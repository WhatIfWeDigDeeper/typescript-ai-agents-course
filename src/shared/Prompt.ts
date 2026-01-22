/**
 * Represents a complete prompt to send to an LLM.
 *
 * A Prompt combines:
 * - Messages: The conversation history
 * - Tools: Available functions the LLM can call (optional)
 * - Metadata: Additional configuration (optional)
 *
 * @example
 * ```typescript
 * // Simple prompt with just messages
 * const prompt = new Prompt([
 *   Message.system("You are helpful."),
 *   Message.user("Hello!")
 * ]);
 *
 * // Prompt with tools
 * const prompt = new Prompt(
 *   [Message.system("Use tools to help the user."), Message.user("List files")],
 *   [Tool.listFiles(), Tool.readFile(), Tool.terminate()]
 * );
 * ```
 */

import { Message } from './Message';
import { Tool } from './Tool';

/** Optional metadata for the prompt */
export interface PromptMetadata {
  /** Model temperature (0-2, lower = more deterministic) */
  temperature?: number;
  /** Maximum tokens in response */
  maxTokens?: number;
  /** Custom identifier for tracking */
  requestId?: string;
}

export class Prompt {
  /**
   * Creates a new Prompt.
   * @param messages - The conversation messages
   * @param tools - Available tools (empty array if none)
   * @param metadata - Optional configuration
   */
  constructor(
    public readonly messages: readonly Message[],
    public readonly tools: readonly Tool[] = [],
    public readonly metadata: PromptMetadata = {}
  ) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // Builder Methods (return new instances)
  // ─────────────────────────────────────────────────────────────────────────────

  /** Creates a new Prompt with an additional message */
  withMessage(message: Message): Prompt {
    return new Prompt([...this.messages, message], this.tools, this.metadata);
  }

  /** Creates a new Prompt with additional messages */
  withMessages(messages: Message[]): Prompt {
    return new Prompt([...this.messages, ...messages], this.tools, this.metadata);
  }

  /** Creates a new Prompt with tools */
  withTools(tools: Tool[]): Prompt {
    return new Prompt(this.messages, tools, this.metadata);
  }

  /** Creates a new Prompt with updated metadata */
  withMetadata(metadata: Partial<PromptMetadata>): Prompt {
    return new Prompt(this.messages, this.tools, { ...this.metadata, ...metadata });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Accessors
  // ─────────────────────────────────────────────────────────────────────────────

  /** Returns true if this prompt has tools */
  hasTools(): boolean {
    return this.tools.length > 0;
  }

  /** Returns the number of messages */
  get messageCount(): number {
    return this.messages.length;
  }

  /** Returns the last message, or undefined if empty */
  get lastMessage(): Message | undefined {
    return this.messages[this.messages.length - 1];
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Factory Methods
  // ─────────────────────────────────────────────────────────────────────────────

  /** Creates a simple prompt from a system message and user input */
  static simple(systemPrompt: string, userInput: string): Prompt {
    return new Prompt([
      Message.system(systemPrompt),
      Message.user(userInput),
    ]);
  }

  /** Creates a prompt from just a user message */
  static fromUser(userInput: string): Prompt {
    return new Prompt([Message.user(userInput)]);
  }
}
