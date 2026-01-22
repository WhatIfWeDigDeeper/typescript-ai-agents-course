/**
 * Typed Conversation Memory
 *
 * This module provides a typed conversation history for agent interactions.
 * Unlike the key-value Memory class, this specifically tracks the conversation
 * flow with typed entries for user, assistant, and environment messages.
 *
 * This matches Python's Memory class in the GAME framework:
 * - Items are typed (user, assistant, environment)
 * - Supports filtering and transformation
 * - Can be converted to LLM message format
 *
 * @example
 * ```typescript
 * const memory = new ConversationMemory();
 *
 * // Add conversation items
 * memory.add('user', 'List the files');
 * memory.add('assistant', '{"tool": "listFiles", "args": {}}');
 * memory.add('environment', '{"result": ["file1.ts", "file2.ts"]}');
 *
 * // Convert to messages for LLM
 * const messages = memory.toMessages();
 * ```
 */

import { Message } from './Message';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Types of memory items in a conversation.
 *
 * - user: Messages from the user
 * - assistant: Messages from the AI assistant (including tool calls)
 * - environment: Results from tool execution
 * - system: System-level instructions (rarely stored in memory)
 */
export type MemoryItemType = 'user' | 'assistant' | 'environment' | 'system';

/**
 * A single item in conversation memory.
 */
export interface MemoryItem {
  /** The type of this memory item */
  type: MemoryItemType;

  /** The content of the item */
  content: string;

  /** Optional timestamp */
  timestamp?: Date;

  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// ConversationMemory Class
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Manages typed conversation history for an agent.
 *
 * This is distinct from the key-value Memory class. ConversationMemory
 * specifically tracks the flow of a conversation with typed entries.
 */
export class ConversationMemory {
  private items: MemoryItem[] = [];

  // ─────────────────────────────────────────────────────────────────────────────
  // Adding Items
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Adds an item to memory.
   *
   * @param type - Type of the memory item
   * @param content - Content string
   * @param metadata - Optional metadata
   */
  add(type: MemoryItemType, content: string, metadata?: Record<string, unknown>): this {
    this.items.push({
      type,
      content,
      timestamp: new Date(),
      metadata,
    });
    return this;
  }

  /**
   * Adds a user message.
   */
  addUser(content: string): this {
    return this.add('user', content);
  }

  /**
   * Adds an assistant message.
   */
  addAssistant(content: string): this {
    return this.add('assistant', content);
  }

  /**
   * Adds an environment result.
   */
  addEnvironment(content: string): this {
    return this.add('environment', content);
  }

  /**
   * Adds a system message.
   */
  addSystem(content: string): this {
    return this.add('system', content);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Retrieving Items
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Gets all items, optionally limited to the most recent N items.
   *
   * @param limit - Maximum number of items to return (from the end)
   */
  getItems(limit?: number): MemoryItem[] {
    if (limit === undefined) {
      return [...this.items];
    }
    return this.items.slice(-limit);
  }

  /**
   * Gets the last N items.
   */
  getLast(n: number): MemoryItem[] {
    return this.items.slice(-n);
  }

  /**
   * Gets items of a specific type.
   */
  getByType(type: MemoryItemType): MemoryItem[] {
    return this.items.filter(item => item.type === type);
  }

  /**
   * Gets the most recent item.
   */
  getLatest(): MemoryItem | undefined {
    return this.items[this.items.length - 1];
  }

  /**
   * Gets the number of items in memory.
   */
  get length(): number {
    return this.items.length;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Filtering & Copying
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Creates a copy of this memory without system items.
   */
  copyWithoutSystem(): ConversationMemory {
    const memory = new ConversationMemory();
    memory.items = this.items.filter(m => m.type !== 'system');
    return memory;
  }

  /**
   * Creates a deep copy of this memory.
   */
  copy(): ConversationMemory {
    const memory = new ConversationMemory();
    memory.items = this.items.map(item => ({ ...item }));
    return memory;
  }

  /**
   * Clears all items from memory.
   */
  clear(): this {
    this.items = [];
    return this;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Conversion to Messages
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Converts memory items to Message objects for LLM consumption.
   *
   * The mapping is:
   * - user → user
   * - assistant → assistant
   * - environment → user (tool results are sent as user messages)
   * - system → system
   */
  toMessages(): Message[] {
    return this.items.map(item => {
      switch (item.type) {
        case 'user':
          return Message.user(item.content);
        case 'assistant':
          return Message.assistant(item.content);
        case 'environment':
          // Environment results are typically sent as user messages
          // (the "user" here is the environment responding to the assistant)
          return Message.user(item.content);
        case 'system':
          return Message.system(item.content);
        default:
          return Message.user(item.content);
      }
    });
  }

  /**
   * Gets items formatted for LLM with a specific role mapping.
   *
   * This allows custom mapping of item types to roles.
   */
  toMessagesWithMapping(mapping: Partial<Record<MemoryItemType, 'user' | 'assistant' | 'system'>>): Message[] {
    const defaultMapping: Record<MemoryItemType, 'user' | 'assistant' | 'system'> = {
      user: 'user',
      assistant: 'assistant',
      environment: 'user',
      system: 'system',
    };

    const finalMapping = { ...defaultMapping, ...mapping };

    return this.items.map(item => {
      const role = finalMapping[item.type];
      return new Message(role, item.content);
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Serialization
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Converts to a plain object for JSON serialization.
   */
  toJSON(): MemoryItem[] {
    return this.items.map(item => ({
      type: item.type,
      content: item.content,
      timestamp: item.timestamp,
      metadata: item.metadata,
    }));
  }

  /**
   * Creates a ConversationMemory from a JSON array.
   */
  static fromJSON(items: MemoryItem[]): ConversationMemory {
    const memory = new ConversationMemory();
    memory.items = items.map(item => ({
      type: item.type,
      content: item.content,
      timestamp: item.timestamp ? new Date(item.timestamp) : undefined,
      metadata: item.metadata,
    }));
    return memory;
  }

  /**
   * Returns a string representation for debugging.
   */
  toString(): string {
    if (this.items.length === 0) {
      return '(empty)';
    }

    return this.items
      .map(item => `[${item.type}] ${item.content.substring(0, 50)}${item.content.length > 50 ? '...' : ''}`)
      .join('\n');
  }
}
