/**
 * Represents a message in an LLM conversation.
 *
 * Messages are the fundamental unit of communication with language models.
 * Each message has a role (who said it) and content (what was said).
 *
 * @example
 * ```typescript
 * // Using static factory methods (recommended)
 * const system = Message.system("You are a helpful assistant.");
 * const user = Message.user("Hello!");
 * const assistant = Message.assistant("Hi there!");
 *
 * // Or construct directly
 * const msg = new Message("user", "Hello!");
 * ```
 */

/** Valid roles for LLM messages */
export type Role = 'system' | 'user' | 'assistant';

export class Message {
  /**
   * Creates a new Message.
   * @param role - Who sent this message (system, user, or assistant)
   * @param content - The text content of the message
   */
  constructor(
    public readonly role: Role,
    public readonly content: string
  ) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // Factory Methods - Preferred way to create messages
  // ─────────────────────────────────────────────────────────────────────────────

  /** Creates a system message (instructions for the LLM) */
  static system(content: string): Message {
    return new Message('system', content);
  }

  /** Creates a user message (human input) */
  static user(content: string): Message {
    return new Message('user', content);
  }

  /** Creates an assistant message (LLM response) */
  static assistant(content: string): Message {
    return new Message('assistant', content);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Serialization
  // ─────────────────────────────────────────────────────────────────────────────

  /** Converts to a plain object (useful for JSON serialization) */
  toJSON(): { role: Role; content: string } {
    return { role: this.role, content: this.content };
  }

  /** Creates a Message from a plain object */
  static fromJSON(json: { role: Role; content: string }): Message {
    return new Message(json.role, json.content);
  }

  /** String representation for debugging */
  toString(): string {
    return `[${this.role}]: ${this.content.substring(0, 50)}${this.content.length > 50 ? '...' : ''}`;
  }
}
