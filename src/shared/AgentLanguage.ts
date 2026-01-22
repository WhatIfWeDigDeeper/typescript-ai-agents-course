/**
 * Agent Language Abstraction
 *
 * This module provides the AgentLanguage abstraction that controls how an agent
 * communicates with an LLM. Different language implementations determine:
 *
 * 1. How goals, actions, and memory are formatted into a prompt
 * 2. How the LLM response is parsed into a structured action
 * 3. How parsing errors are handled with retry logic
 *
 * This matches the Python course's AgentLanguage pattern with three implementations:
 *
 * - NaturalLanguage: Simple Q&A, terminates on any response
 * - JsonActionLanguage: Text-based with ```action block parsing
 * - FunctionCallingLanguage: OpenAI function calling API
 *
 * @example
 * ```typescript
 * // Using JsonActionLanguage for text-based action parsing
 * const language = new JsonActionLanguage();
 * const prompt = language.constructPrompt({ goals, actions, memory });
 * const response = await llm.generate(prompt);
 * const action = language.parseResponse(response);
 *
 * // Using FunctionCallingLanguage for OpenAI function calling
 * const language = new FunctionCallingLanguage();
 * const prompt = language.constructPrompt({ goals, actions, memory });
 * // prompt.tools will be populated for OpenAI API
 * ```
 */

import { Message } from './Message';
import { Prompt } from './Prompt';
import { Tool } from './Tool';
import { ConversationMemory } from './ConversationMemory';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A goal provides high-level direction for the agent.
 */
export interface Goal {
  /** Unique name for the goal */
  name: string;

  /** Detailed description of what the goal entails */
  description: string;

  /** Priority (lower = higher priority) */
  priority?: number;
}

/**
 * A parsed action from the LLM response.
 */
export interface ParsedAction {
  /** Name of the tool to call */
  tool: string;

  /** Arguments to pass to the tool */
  args: Record<string, unknown>;
}

/**
 * Context provided to the language for constructing prompts.
 */
export interface PromptContext {
  /** Agent's goals */
  goals: Goal[];

  /** Available tools/actions */
  actions: Tool[];

  /** Conversation memory */
  memory: ConversationMemory;
}

/**
 * Context for adapting a prompt after a parsing error.
 */
export interface ErrorContext {
  /** The original prompt */
  prompt: Prompt;

  /** The raw LLM response that failed to parse */
  response: string;

  /** Error message */
  error: string;

  /** Stack trace if available */
  traceback?: string;

  /** Number of retries remaining */
  retriesLeft: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Base AgentLanguage Class
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Abstract base class for agent languages.
 *
 * An AgentLanguage defines how the agent communicates with the LLM:
 * - How to construct prompts from goals, actions, and memory
 * - How to parse LLM responses into structured actions
 * - How to handle parsing errors
 */
export abstract class AgentLanguage {
  /**
   * Constructs a prompt from the given context.
   *
   * @param context - Goals, actions, and memory to include in the prompt
   * @returns A Prompt ready to send to the LLM
   */
  abstract constructPrompt(context: PromptContext): Prompt;

  /**
   * Parses an LLM response into a structured action.
   *
   * @param response - Raw string response from the LLM
   * @returns ParsedAction with tool name and arguments
   * @throws Error if the response cannot be parsed
   */
  abstract parseResponse(response: string): ParsedAction;

  /**
   * Adapts a prompt after a parsing error to help the LLM correct itself.
   *
   * Default implementation returns the original prompt unchanged.
   * Subclasses can override to add error feedback.
   *
   * @param context - Error context with original prompt, response, and error details
   * @returns An adapted Prompt for retry
   */
  adaptPromptAfterParsingError(context: ErrorContext): Prompt {
    return context.prompt;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Helper Methods
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Formats goals into a system message.
   */
  protected formatGoals(goals: Goal[]): Message {
    const sorted = [...goals].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
    const sep = '\n-------------------\n';
    const goalText = sorted
      .map(g => `${g.name}:${sep}${g.description}${sep}`)
      .join('\n\n');
    return Message.system(goalText);
  }

  /**
   * Converts conversation memory to messages.
   *
   * Maps memory item types to roles:
   * - user -> user
   * - assistant -> assistant
   * - environment -> assistant (results are shown as assistant context)
   * - system -> system
   */
  protected formatMemory(memory: ConversationMemory): Message[] {
    const items = memory.getItems();
    return items.map(item => {
      const content = item.content;

      switch (item.type) {
        case 'assistant':
          return Message.assistant(content);
        case 'environment':
          // Environment results shown as assistant context
          return Message.assistant(content);
        case 'system':
          return Message.system(content);
        default:
          return Message.user(content);
      }
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// NaturalLanguage Implementation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Simple natural language communication.
 *
 * This language implementation is for basic Q&A scenarios where:
 * - Goals are provided as system instructions
 * - No tools/actions are included in the prompt
 * - Any response terminates with the "terminate" action
 *
 * Use this when you want simple chat without tool calling.
 *
 * @example
 * ```typescript
 * const language = new NaturalLanguage();
 * const prompt = language.constructPrompt({
 *   goals: [{ name: 'Assistant', description: 'Help the user' }],
 *   actions: [], // Ignored
 *   memory,
 * });
 *
 * const response = await llm.generate(prompt);
 * const action = language.parseResponse(response);
 * // action = { tool: 'terminate', args: { message: response } }
 * ```
 */
export class NaturalLanguage extends AgentLanguage {
  constructPrompt(context: PromptContext): Prompt {
    const { goals, memory } = context;

    const messages: Message[] = [];

    // Add goals as system message
    if (goals.length > 0) {
      const goalText = goals.map(g => g.description).join('\n');
      messages.push(Message.system(goalText));
    }

    // Add memory
    messages.push(...this.formatMemory(memory));

    // No tools - this is pure conversation
    return new Prompt(messages, []);
  }

  parseResponse(response: string): ParsedAction {
    // Any response terminates - this is simple Q&A
    return {
      tool: 'terminate',
      args: { message: response },
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// JsonActionLanguage Implementation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format for ```action blocks.
 */
const ACTION_FORMAT = `
<Stop and think step by step. Insert a rich description of your step by step thoughts here.>

\`\`\`action
{
    "tool": "tool_name",
    "args": {...fill in any required arguments here...}
}
\`\`\``;

/**
 * Text-based action language using ```action code blocks.
 *
 * This language implementation:
 * - Includes actions as JSON descriptions in the system prompt
 * - Instructs the LLM to respond with ```action blocks
 * - Parses responses by extracting the ```action block
 * - Provides error feedback for retry on parsing failures
 *
 * This demonstrates text-parsing agents that don't rely on OpenAI function calling.
 *
 * @example
 * ```typescript
 * const language = new JsonActionLanguage();
 * const prompt = language.constructPrompt({ goals, actions, memory });
 *
 * const response = await llm.generate(prompt);
 * // Response might be:
 * // "Let me list the files.\n```action\n{\"tool\": \"listFiles\", \"args\": {}}\n```"
 *
 * const action = language.parseResponse(response);
 * // action = { tool: 'listFiles', args: {} }
 * ```
 */
export class JsonActionLanguage extends AgentLanguage {
  constructPrompt(context: PromptContext): Prompt {
    const { goals, actions, memory } = context;

    const messages: Message[] = [];

    // Add goals as system message
    if (goals.length > 0) {
      messages.push(this.formatGoals(goals));
    }

    // Add actions as system message
    if (actions.length > 0) {
      messages.push(this.formatActions(actions));
    }

    // Add memory
    messages.push(...this.formatMemory(memory));

    // No OpenAI tools - we're using text-based action blocks
    return new Prompt(messages, []);
  }

  parseResponse(response: string): ParsedAction {
    const startMarker = '```action';
    const endMarker = '```';

    const trimmed = response.trim();
    const startIndex = trimmed.indexOf(startMarker);

    if (startIndex === -1) {
      throw new Error(`Response does not contain an \`\`\`action block`);
    }

    // Find the closing ``` after the start marker
    const afterStart = startIndex + startMarker.length;
    const endIndex = trimmed.indexOf(endMarker, afterStart);

    if (endIndex === -1) {
      throw new Error(`Response has unclosed \`\`\`action block`);
    }

    const jsonContent = trimmed.slice(afterStart, endIndex).trim();

    try {
      const parsed = JSON.parse(jsonContent);

      if (typeof parsed.tool !== 'string') {
        throw new Error('Parsed action missing "tool" field');
      }

      return {
        tool: parsed.tool,
        args: parsed.args ?? {},
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to parse action JSON: ${message}`);
    }
  }

  adaptPromptAfterParsingError(context: ErrorContext): Prompt {
    const { prompt, response, error } = context;

    // Add the failed response and error feedback
    const newMessages = [
      ...prompt.messages,
      Message.assistant(response),
      Message.user(
        `Your last output did not contain a valid \`\`\`action block that could be parsed.\n` +
        `Error: ${error}\n\n` +
        `Please fix your prior response.\n` +
        `Make sure that it has the correct format:\n` +
        ACTION_FORMAT
      ),
    ];

    return new Prompt(newMessages, prompt.tools, prompt.metadata);
  }

  /**
   * Formats actions into a system message with JSON descriptions.
   */
  private formatActions(actions: Tool[]): Message {
    const actionDescriptions = actions.map(action => ({
      name: action.name,
      description: action.description,
      args: action.parameters,
    }));

    const content = `
Available Tools: ${JSON.stringify(actionDescriptions, null, 2)}

When you are done, terminate the conversation by using the "terminate" tool and I will
provide the results to the user.

Important!!! Every response MUST have an action.
You must ALWAYS respond in this format:

${ACTION_FORMAT}
`;

    return Message.system(content);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FunctionCallingLanguage Implementation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * OpenAI function calling language.
 *
 * This language implementation:
 * - Includes actions as OpenAI tools in the prompt
 * - Expects responses in JSON format from LLM.generate()
 * - Parses the { tool, args } response directly
 *
 * This leverages OpenAI's native function calling for structured output.
 *
 * @example
 * ```typescript
 * const language = new FunctionCallingLanguage();
 * const prompt = language.constructPrompt({ goals, actions, memory });
 *
 * // prompt.tools is populated for OpenAI
 * const response = await llm.generate(prompt);
 * // Response is JSON: '{"tool": "listFiles", "args": {}}'
 *
 * const action = language.parseResponse(response);
 * // action = { tool: 'listFiles', args: {} }
 * ```
 */
export class FunctionCallingLanguage extends AgentLanguage {
  constructPrompt(context: PromptContext): Prompt {
    const { goals, actions, memory } = context;

    const messages: Message[] = [];

    // Add goals as system message
    if (goals.length > 0) {
      messages.push(this.formatGoals(goals));
    }

    // Add memory
    messages.push(...this.formatMemory(memory));

    // Include actions as OpenAI tools
    return new Prompt(messages, actions);
  }

  parseResponse(response: string): ParsedAction {
    try {
      // LLM.generate() returns JSON for tool calls
      const parsed = JSON.parse(response);

      if (typeof parsed.tool === 'string') {
        return {
          tool: parsed.tool,
          args: parsed.args ?? {},
        };
      }

      // If it's not a tool call, treat as terminate
      return {
        tool: 'terminate',
        args: { message: response },
      };
    } catch {
      // Non-JSON response means the LLM responded with text
      return {
        tool: 'terminate',
        args: { message: response },
      };
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a Goal object.
 *
 * @param name - Goal name
 * @param description - Goal description
 * @param priority - Optional priority (lower = higher priority)
 */
export function createGoal(name: string, description: string, priority = 0): Goal {
  return { name, description, priority };
}

/**
 * Extracts a code block from a string.
 *
 * @param text - Text containing a code block
 * @param language - Language marker (e.g., 'json', 'action', 'typescript')
 * @returns The content inside the code block, or null if not found
 */
export function extractCodeBlock(text: string, language: string): string | null {
  const startMarker = '```' + language;
  const endMarker = '```';

  const trimmed = text.trim();
  const startIndex = trimmed.indexOf(startMarker);

  if (startIndex === -1) {
    return null;
  }

  const afterStart = startIndex + startMarker.length;
  const endIndex = trimmed.indexOf(endMarker, afterStart);

  if (endIndex === -1) {
    return null;
  }

  return trimmed.slice(afterStart, endIndex).trim();
}
