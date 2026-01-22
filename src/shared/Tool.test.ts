/**
 * Tests for Tool class.
 */

import { Tool } from './Tool';

describe('Tool', () => {
  describe('constructor', () => {
    it('should create tool with name, description, and parameters', () => {
      const tool = new Tool(
        'readFile',
        'Reads a file',
        {
          type: 'object',
          properties: {
            fileName: { type: 'string', description: 'File name' },
          },
          required: ['fileName'],
        }
      );

      expect(tool.name).toBe('readFile');
      expect(tool.description).toBe('Reads a file');
      expect(tool.parameters.required).toContain('fileName');
    });

    it('should default parameters to empty object schema', () => {
      const tool = new Tool('simple', 'A simple tool');
      expect(tool.parameters).toEqual({ type: 'object', properties: {} });
    });
  });

  describe('factory methods', () => {
    it('should create listFiles tool', () => {
      const tool = Tool.listFiles();
      expect(tool.name).toBe('listFiles');
      expect(tool.description).toContain('file');
    });

    it('should create readFile tool', () => {
      const tool = Tool.readFile();
      expect(tool.name).toBe('readFile');
      expect(tool.parameters.properties).toHaveProperty('fileName');
      expect(tool.parameters.required).toContain('fileName');
    });

    it('should create terminate tool', () => {
      const tool = Tool.terminate();
      expect(tool.name).toBe('terminate');
      expect(tool.parameters.properties).toHaveProperty('message');
    });

    it('should allow custom descriptions', () => {
      const tool = Tool.listFiles('Custom list description');
      expect(tool.description).toBe('Custom list description');
    });
  });

  describe('serialization', () => {
    it('should convert to JSON', () => {
      const tool = new Tool('test', 'Test tool', {
        type: 'object',
        properties: { arg1: { type: 'string' } },
      });

      const json = tool.toJSON();
      expect(json).toEqual({
        name: 'test',
        description: 'Test tool',
        parameters: {
          type: 'object',
          properties: { arg1: { type: 'string' } },
        },
      });
    });

    it('should create from JSON with name field', () => {
      const json = {
        name: 'myTool',
        description: 'My tool',
        parameters: { type: 'object' as const, properties: {} },
      };

      const tool = Tool.fromJSON(json);
      expect(tool.name).toBe('myTool');
      expect(tool.description).toBe('My tool');
    });

    it('should create from JSON with toolName field', () => {
      const json = {
        toolName: 'myTool',
        description: 'My tool',
      };

      const tool = Tool.fromJSON(json);
      expect(tool.name).toBe('myTool');
    });

    it('should throw if no name in JSON', () => {
      expect(() => Tool.fromJSON({ description: 'No name' })).toThrow();
    });

    it('should parse from JSON string', () => {
      const jsonString = JSON.stringify({
        name: 'parsed',
        description: 'Parsed tool',
      });

      const tool = Tool.parse(jsonString);
      expect(tool.name).toBe('parsed');
    });

    it('should have readable toString', () => {
      const tool = new Tool('readFile', 'Reads file contents');
      const str = tool.toString();
      expect(str).toContain('readFile');
      expect(str).toContain('Reads file contents');
    });
  });
});
