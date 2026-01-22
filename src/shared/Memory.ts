/**
 * Agent memory storage for maintaining context across interactions.
 *
 * Memory stores key-value pairs that persist across agent loop iterations.
 * This is useful for tracking state, storing intermediate results, and
 * providing context to the LLM.
 *
 * @example
 * ```typescript
 * const memory = new Memory();
 *
 * // Store values
 * memory.set("user_name", "Alice");
 * memory.set("files_read", ["a.txt", "b.txt"]);
 *
 * // Retrieve values
 * const name = memory.get<string>("user_name"); // "Alice"
 *
 * // Check existence
 * if (memory.has("user_name")) { ... }
 *
 * // Convert to string for LLM context
 * const context = memory.toString();
 * ```
 */

export class Memory {
  private readonly store: Map<string, unknown>;

  constructor(initial?: Record<string, unknown>) {
    this.store = new Map(initial ? Object.entries(initial) : []);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Core Operations
  // ─────────────────────────────────────────────────────────────────────────────

  /** Stores a value with the given key */
  set<T>(key: string, value: T): void {
    this.store.set(key, value);
  }

  /** Retrieves a value by key */
  get<T>(key: string): T | undefined {
    return this.store.get(key) as T | undefined;
  }

  /** Retrieves a value, throwing if not found */
  require<T>(key: string): T {
    if (!this.store.has(key)) {
      throw new Error(`Memory key not found: ${key}`);
    }
    return this.store.get(key) as T;
  }

  /** Checks if a key exists */
  has(key: string): boolean {
    return this.store.has(key);
  }

  /** Deletes a key */
  delete(key: string): boolean {
    return this.store.delete(key);
  }

  /** Clears all stored values */
  clear(): void {
    this.store.clear();
  }

  /** Returns all keys */
  keys(): string[] {
    return Array.from(this.store.keys());
  }

  /** Returns the number of stored items */
  get size(): number {
    return this.store.size;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Convenience Methods
  // ─────────────────────────────────────────────────────────────────────────────

  /** Appends a value to an array (creates array if key doesn't exist) */
  append<T>(key: string, value: T): void {
    const existing = this.get<T[]>(key) ?? [];
    this.set(key, [...existing, value]);
  }

  /** Increments a numeric value (starts at 0 if doesn't exist) */
  increment(key: string, amount = 1): number {
    const current = this.get<number>(key) ?? 0;
    const newValue = current + amount;
    this.set(key, newValue);
    return newValue;
  }

  /** Gets a value with a default if not present */
  getOrDefault<T>(key: string, defaultValue: T): T {
    return this.has(key) ? (this.get<T>(key) as T) : defaultValue;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Serialization
  // ─────────────────────────────────────────────────────────────────────────────

  /** Converts to a plain object */
  toObject(): Record<string, unknown> {
    return Object.fromEntries(this.store);
  }

  /** Converts to JSON string */
  toJSON(): string {
    return JSON.stringify(this.toObject(), null, 2);
  }

  /** Creates Memory from a plain object */
  static fromObject(obj: Record<string, unknown>): Memory {
    return new Memory(obj);
  }

  /**
   * Converts to a human-readable string for LLM context.
   * Format: "key1: value1\nkey2: value2"
   */
  toString(): string {
    if (this.store.size === 0) {
      return '(empty)';
    }

    return Array.from(this.store.entries())
      .map(([key, value]) => {
        const valueStr = typeof value === 'object'
          ? JSON.stringify(value)
          : String(value);
        return `${key}: ${valueStr}`;
      })
      .join('\n');
  }
}
