/**
 * GAME Agent
 *
 * This module provides the core Agent class that implements the GAME framework:
 * - Goals: What the agent is trying to achieve
 * - Actions: Tools the agent can use
 * - Memory: Conversation history
 * - Environment: Where actions are executed
 *
 * The Agent orchestrates the loop:
 * 1. Construct a prompt from GAME components
 * 2. Send to LLM for a decision
 * 3. Parse the response into an action
 * 4. Execute the action in the environment
 * 5. Update memory with results
 * 6. Repeat until termination
 *
 * This matches Python's Agent class in the course materials.
 *
 * @example
 * ```typescript
 * // Create agent with GAME components
 * const agent = new Agent({
 *   goals: [{ name: 'Helper', description: 'Help the user with file operations' }],
 *   language: new FunctionCallingLanguage(),
 *   registry: new ToolRegistry({ tags: ['file_operations'] }),
 *   generateResponse: (prompt) => llm.generate(prompt),
 *   environment: new Environment(),
 * });
 *
 * // Run the agent
 * const memory = await agent.run('List all files in the current directory');
 * console.log(memory.toString());
 * ```
 */

import { Prompt } from './Prompt';
import { ConversationMemory } from './ConversationMemory';
import { ToolRegistry } from './ToolRegistry';
import { Environment, ActionResultEnvelope } from './Environment';
import { AgentLanguage, Goal, ParsedAction } from './AgentLanguage';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Function type for generating LLM responses.
 * This abstraction allows different LLM backends to be used.
 */
export type GenerateResponseFn = (prompt: Prompt) => Promise<string>;

/**
 * Configuration for creating an Agent.
 */
export interface AgentConfig {
  /** Agent's goals - what it's trying to achieve */
  goals: Goal[];

  /** Language defining how to communicate with the LLM */
  language: AgentLanguage;

  /** Registry of available tools/actions */
  registry: ToolRegistry;

  /** Function to generate LLM responses */
  generateResponse: GenerateResponseFn;

  /** Environment where actions are executed */
  environment?: Environment;

  /** Maximum iterations before forced termination */
  maxIterations?: number;

  /** Maximum retries for parsing errors */
  maxParseRetries?: number;

  /** Enable verbose logging */
  verbose?: boolean;
}

/**
 * Result of a single agent step.
 */
export interface AgentStepResult {
  /** The raw LLM response */
  response: string;

  /** The parsed action */
  action: ParsedAction;

  /** The execution result */
  result: ActionResultEnvelope;

  /** Whether this step terminated the agent loop */
  terminated: boolean;
}

/**
 * Callbacks for observing agent execution.
 */
export interface AgentCallbacks {
  /** Called before each LLM prompt */
  onBeforePrompt?: (prompt: Prompt, iteration: number) => void;

  /** Called after LLM response */
  onResponse?: (response: string, iteration: number) => void;

  /** Called after action execution */
  onActionExecuted?: (result: AgentStepResult, iteration: number) => void;

  /** Called on parse error */
  onParseError?: (error: Error, response: string, retriesLeft: number) => void;

  /** Called when agent terminates */
  onTerminate?: (memory: ConversationMemory, reason: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent Class
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The core Agent implementing the GAME framework.
 *
 * An Agent:
 * - Has Goals that define its purpose
 * - Uses Actions (tools) to accomplish tasks
 * - Maintains Memory of the conversation
 * - Operates within an Environment
 *
 * The AgentLanguage controls how Goals, Actions, and Memory are formatted
 * into prompts and how LLM responses are parsed into actions.
 */
export class Agent {
  /** Agent's goals */
  public readonly goals: Goal[];

  /** Language for prompt construction and response parsing */
  public readonly language: AgentLanguage;

  /** Registry of available tools */
  public readonly registry: ToolRegistry;

  /** Function to generate LLM responses */
  public readonly generateResponse: GenerateResponseFn;

  /** Environment for action execution */
  public readonly environment: Environment;

  /** Maximum iterations */
  public readonly maxIterations: number;

  /** Maximum parse retries */
  public readonly maxParseRetries: number;

  /** Verbose logging */
  public readonly verbose: boolean;

  /** Optional callbacks */
  public callbacks: AgentCallbacks = {};

  constructor(config: AgentConfig) {
    this.goals = config.goals;
    this.language = config.language;
    this.registry = config.registry;
    this.generateResponse = config.generateResponse;
    this.environment = config.environment ?? new Environment();
    this.maxIterations = config.maxIterations ?? 50;
    this.maxParseRetries = config.maxParseRetries ?? 3;
    this.verbose = config.verbose ?? false;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Main API
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Runs the agent on user input.
   *
   * This is the main entry point. It:
   * 1. Creates or uses provided memory
   * 2. Adds the user input to memory
   * 3. Runs the GAME loop until termination or max iterations
   * 4. Returns the final memory
   *
   * @param userInput - The user's request/task
   * @param memory - Optional existing memory (creates new if not provided)
   * @returns The conversation memory after completion
   */
  async run(userInput: string, memory?: ConversationMemory): Promise<ConversationMemory> {
    const conversationMemory = memory ?? new ConversationMemory();

    // Set the current task
    conversationMemory.addUser(userInput);

    // Run the GAME loop
    for (let iteration = 0; iteration < this.maxIterations; iteration++) {
      this.log(`\n--- Iteration ${iteration + 1} ---`);

      const stepResult = await this.step(conversationMemory, iteration);

      if (stepResult.terminated) {
        this.callbacks.onTerminate?.(conversationMemory, 'terminal_action');
        break;
      }

      // Check for max iterations
      if (iteration === this.maxIterations - 1) {
        this.log('Max iterations reached');
        this.callbacks.onTerminate?.(conversationMemory, 'max_iterations');
      }
    }

    return conversationMemory;
  }

  /**
   * Executes a single step of the GAME loop.
   *
   * @param memory - Current conversation memory
   * @param iteration - Current iteration number
   * @returns Step result with response, action, and termination status
   */
  async step(memory: ConversationMemory, iteration: number): Promise<AgentStepResult> {
    // Construct the prompt
    const prompt = this.constructPrompt(memory);
    this.callbacks.onBeforePrompt?.(prompt, iteration);

    this.log('Agent thinking...');

    // Get LLM response with retry logic for parse errors
    const { response, action } = await this.getActionWithRetry(prompt, iteration);
    this.callbacks.onResponse?.(response, iteration);

    this.log(`Agent Decision: ${response.substring(0, 200)}...`);

    // Execute the action
    const result = await this.executeAction(action);
    this.log(`Action Result: ${JSON.stringify(result).substring(0, 200)}...`);

    // Update memory
    this.updateMemory(memory, response, result);

    // Check termination
    const terminated = this.registry.isTerminal(action.tool);

    const stepResult: AgentStepResult = {
      response,
      action,
      result,
      terminated,
    };

    this.callbacks.onActionExecuted?.(stepResult, iteration);

    return stepResult;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Prompt Construction
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Constructs a prompt from the current GAME state.
   */
  constructPrompt(memory: ConversationMemory): Prompt {
    return this.language.constructPrompt({
      goals: this.goals,
      actions: this.registry.getTools(),
      memory,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Response Parsing
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Gets an action from the LLM with retry logic for parse errors.
   */
  private async getActionWithRetry(
    prompt: Prompt,
    _iteration: number
  ): Promise<{ response: string; action: ParsedAction }> {
    let currentPrompt = prompt;
    let retriesLeft = this.maxParseRetries;

    while (retriesLeft > 0) {
      // Get LLM response
      const response = await this.generateResponse(currentPrompt);

      try {
        // Try to parse the response
        const action = this.language.parseResponse(response);
        return { response, action };
      } catch (error) {
        retriesLeft--;
        const err = error instanceof Error ? error : new Error(String(error));

        this.log(`Parse error (${retriesLeft} retries left): ${err.message}`);
        this.callbacks.onParseError?.(err, response, retriesLeft);

        if (retriesLeft === 0) {
          // Final failure - return terminate action
          return {
            response,
            action: {
              tool: 'terminate',
              args: { message: `Failed to parse response: ${err.message}` },
            },
          };
        }

        // Adapt the prompt for retry
        currentPrompt = this.language.adaptPromptAfterParsingError({
          prompt: currentPrompt,
          response,
          error: err.message,
          traceback: err.stack,
          retriesLeft,
        });
      }
    }

    // Should never reach here, but TypeScript needs it
    throw new Error('Unexpected end of retry loop');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Action Execution
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Executes an action in the environment.
   */
  private async executeAction(action: ParsedAction): Promise<ActionResultEnvelope> {
    return this.environment.executeAction(
      this.registry,
      action.tool,
      action.args
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Memory Management
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Updates memory with the agent's decision and environment response.
   */
  private updateMemory(
    memory: ConversationMemory,
    response: string,
    result: ActionResultEnvelope
  ): void {
    // Add the assistant's response
    memory.addAssistant(response);

    // Add the environment's result
    memory.addEnvironment(JSON.stringify(result));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Utility
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Logs a message if verbose mode is enabled.
   */
  private log(message: string): void {
    if (this.verbose) {
      console.log(`[Agent] ${message}`);
    }
  }

  /**
   * Returns a string representation for debugging.
   */
  toString(): string {
    const goalNames = this.goals.map(g => g.name).join(', ');
    return `Agent(goals: [${goalNames}], tools: ${this.registry.size})`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Builder Pattern
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builder for creating Agent instances with a fluent API.
 *
 * @example
 * ```typescript
 * const agent = new AgentBuilder()
 *   .withGoal('Assistant', 'Help the user')
 *   .withLanguage(new FunctionCallingLanguage())
 *   .withRegistry(registry)
 *   .withLLM(llm)
 *   .verbose()
 *   .build();
 * ```
 */
export class AgentBuilder {
  private goals: Goal[] = [];
  private language?: AgentLanguage;
  private registry?: ToolRegistry;
  private generateResponse?: GenerateResponseFn;
  private environment?: Environment;
  private maxIterations = 50;
  private maxParseRetries = 3;
  private verboseMode = false;
  private agentCallbacks: AgentCallbacks = {};

  /**
   * Adds a goal to the agent.
   */
  withGoal(name: string, description: string, priority = 0): this {
    this.goals.push({ name, description, priority });
    return this;
  }

  /**
   * Adds multiple goals.
   */
  withGoals(goals: Goal[]): this {
    this.goals.push(...goals);
    return this;
  }

  /**
   * Sets the agent language.
   */
  withLanguage(language: AgentLanguage): this {
    this.language = language;
    return this;
  }

  /**
   * Sets the tool registry.
   */
  withRegistry(registry: ToolRegistry): this {
    this.registry = registry;
    return this;
  }

  /**
   * Sets the response generator function.
   */
  withGenerateResponse(fn: GenerateResponseFn): this {
    this.generateResponse = fn;
    return this;
  }

  /**
   * Sets the response generator from an LLM instance.
   * This is a convenience method that wraps llm.generate().
   */
  withLLM(llm: { generate: (prompt: Prompt) => Promise<string> }): this {
    this.generateResponse = (prompt) => llm.generate(prompt);
    return this;
  }

  /**
   * Sets the environment.
   */
  withEnvironment(env: Environment): this {
    this.environment = env;
    return this;
  }

  /**
   * Sets the maximum iterations.
   */
  withMaxIterations(n: number): this {
    this.maxIterations = n;
    return this;
  }

  /**
   * Sets the maximum parse retries.
   */
  withMaxParseRetries(n: number): this {
    this.maxParseRetries = n;
    return this;
  }

  /**
   * Enables verbose logging.
   */
  verbose(enabled = true): this {
    this.verboseMode = enabled;
    return this;
  }

  /**
   * Sets callbacks.
   */
  withCallbacks(callbacks: AgentCallbacks): this {
    this.agentCallbacks = { ...this.agentCallbacks, ...callbacks };
    return this;
  }

  /**
   * Builds the Agent.
   * @throws Error if required fields are missing
   */
  build(): Agent {
    if (!this.language) {
      throw new Error('Agent requires a language (use withLanguage())');
    }
    if (!this.registry) {
      throw new Error('Agent requires a registry (use withRegistry())');
    }
    if (!this.generateResponse) {
      throw new Error('Agent requires a response generator (use withGenerateResponse() or withLLM())');
    }

    const agent = new Agent({
      goals: this.goals,
      language: this.language,
      registry: this.registry,
      generateResponse: this.generateResponse,
      environment: this.environment,
      maxIterations: this.maxIterations,
      maxParseRetries: this.maxParseRetries,
      verbose: this.verboseMode,
    });

    agent.callbacks = this.agentCallbacks;

    return agent;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a simple agent with function calling.
 *
 * @param llm - LLM instance with generate() method
 * @param registry - Tool registry
 * @param goalDescription - Simple goal description
 * @returns Configured agent
 */
export function createSimpleAgent(
  llm: { generate: (prompt: Prompt) => Promise<string> },
  registry: ToolRegistry,
  goalDescription: string
): Agent {
  // Import here to avoid circular dependency
  const { FunctionCallingLanguage } = require('./AgentLanguage');

  return new AgentBuilder()
    .withGoal('Assistant', goalDescription)
    .withLanguage(new FunctionCallingLanguage())
    .withRegistry(registry)
    .withLLM(llm)
    .build();
}
