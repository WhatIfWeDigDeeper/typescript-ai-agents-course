/**
 * Represents the result of executing an action/tool.
 *
 * Uses a discriminated union pattern for type-safe success/error handling.
 * This is more idiomatic TypeScript than having nullable result/error fields.
 *
 * @example
 * ```typescript
 * // Create results
 * const success = ActionResult.success({ files: ["a.txt", "b.txt"] });
 * const failure = ActionResult.error("File not found");
 *
 * // Handle results
 * if (result.success) {
 *   console.log("Got:", result.value);
 * } else {
 *   console.error("Error:", result.error);
 * }
 *
 * // Wrap async operations
 * const result = await ActionResult.fromPromise(fetchData());
 * ```
 */

/** Successful result with a value */
export interface ActionResultSuccess<T> {
  readonly success: true;
  readonly value: T;
}

/** Failed result with an error message */
export interface ActionResultError {
  readonly success: false;
  readonly error: string;
}

/** Discriminated union of success and error results */
export type ActionResult<T = unknown> = ActionResultSuccess<T> | ActionResultError;

/**
 * Factory functions for creating ActionResults.
 */
export const ActionResult = {
  /**
   * Creates a successful result.
   * @param value - The result value
   */
  success<T>(value: T): ActionResult<T> {
    return { success: true, value };
  },

  /**
   * Creates an error result.
   * @param error - The error message
   */
  error(error: string): ActionResult<never> {
    return { success: false, error };
  },

  /**
   * Wraps a Promise into an ActionResult.
   * Catches any errors and converts them to error results.
   *
   * @param promise - The promise to wrap
   * @returns ActionResult with either the resolved value or error message
   *
   * @example
   * ```typescript
   * const result = await ActionResult.fromPromise(fs.readFile("test.txt"));
   * if (result.success) {
   *   console.log(result.value);
   * } else {
   *   console.error(result.error);
   * }
   * ```
   */
  async fromPromise<T>(promise: Promise<T>): Promise<ActionResult<T>> {
    try {
      const value = await promise;
      return { success: true, value };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  },

  /**
   * Wraps a synchronous function that might throw.
   * @param fn - The function to execute
   * @returns ActionResult with either the return value or error message
   */
  fromTry<T>(fn: () => T): ActionResult<T> {
    try {
      const value = fn();
      return { success: true, value };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  },

  /**
   * Checks if a result is successful (type guard).
   */
  isSuccess<T>(result: ActionResult<T>): result is ActionResultSuccess<T> {
    return result.success;
  },

  /**
   * Checks if a result is an error (type guard).
   */
  isError<T>(result: ActionResult<T>): result is ActionResultError {
    return !result.success;
  },

  /**
   * Converts an ActionResult to a plain object for JSON serialization.
   * Format: { result: value } or { error: message }
   */
  toJSON<T>(result: ActionResult<T>): { result: T } | { error: string } {
    if (result.success) {
      return { result: result.value };
    }
    return { error: result.error };
  },
};
