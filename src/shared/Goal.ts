/**
 * Represents a goal for an AI agent in the GAME framework.
 *
 * Goals define what the agent is trying to achieve. They have:
 * - A name (short identifier)
 * - A description (detailed explanation for the LLM)
 * - A priority (higher = more important)
 * - Completion status
 *
 * @example
 * ```typescript
 * // Create goals
 * const mainGoal = new Goal("analyze_code", "Read and analyze all TypeScript files", 10);
 * const subGoal = new Goal("find_bugs", "Look for potential bugs in the code", 5);
 *
 * // Sort by priority
 * const sorted = Goal.sortByPriority([subGoal, mainGoal]);
 * // Returns [mainGoal, subGoal] (highest priority first)
 *
 * // Mark as completed
 * mainGoal.complete();
 * ```
 */

export class Goal {
  private _completed = false;

  /**
   * Creates a new Goal.
   * @param name - Short identifier for the goal
   * @param description - Detailed description (shown to LLM)
   * @param priority - Priority level (higher = more important)
   */
  constructor(
    public readonly name: string,
    public readonly description: string,
    public readonly priority: number = 0
  ) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // Status Management
  // ─────────────────────────────────────────────────────────────────────────────

  /** Returns true if this goal has been completed */
  get completed(): boolean {
    return this._completed;
  }

  /** Marks this goal as completed */
  complete(): void {
    this._completed = true;
  }

  /** Marks this goal as not completed (reset) */
  reset(): void {
    this._completed = false;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Factory & Utility Methods
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Sorts goals by priority (highest first).
   * @param goals - Array of goals to sort
   * @returns New sorted array (does not mutate original)
   */
  static sortByPriority(goals: Goal[]): Goal[] {
    return [...goals].sort((a, b) => b.priority - a.priority);
  }

  /**
   * Filters to only incomplete goals.
   * @param goals - Array of goals to filter
   * @returns Array of incomplete goals
   */
  static incomplete(goals: Goal[]): Goal[] {
    return goals.filter(g => !g.completed);
  }

  /**
   * Gets the highest priority incomplete goal.
   * @param goals - Array of goals to search
   * @returns The highest priority incomplete goal, or undefined if all complete
   */
  static nextGoal(goals: Goal[]): Goal | undefined {
    const incomplete = Goal.incomplete(goals);
    if (incomplete.length === 0) return undefined;
    return Goal.sortByPriority(incomplete)[0];
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Serialization
  // ─────────────────────────────────────────────────────────────────────────────

  /** Converts to a plain object */
  toJSON(): { name: string; description: string; priority: number; completed: boolean } {
    return {
      name: this.name,
      description: this.description,
      priority: this.priority,
      completed: this._completed,
    };
  }

  /** Creates a Goal from a plain object */
  static fromJSON(json: { name: string; description: string; priority?: number; completed?: boolean }): Goal {
    const goal = new Goal(json.name, json.description, json.priority ?? 0);
    if (json.completed) goal.complete();
    return goal;
  }

  /** String representation for debugging */
  toString(): string {
    const status = this._completed ? '✓' : '○';
    return `[${status}] ${this.name} (p${this.priority}): ${this.description}`;
  }

  /**
   * Formats multiple goals as a string for LLM context.
   * @param goals - Goals to format
   */
  static formatForLLM(goals: Goal[]): string {
    if (goals.length === 0) return 'No goals defined.';

    return goals
      .map((g, i) => `${i + 1}. [Priority: ${g.priority}] ${g.name}: ${g.description}`)
      .join('\n');
  }
}
