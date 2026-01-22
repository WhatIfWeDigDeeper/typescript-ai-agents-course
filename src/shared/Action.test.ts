/**
 * Tests for Action class.
 */

import { Action } from './Action';

describe('Action', () => {
  describe('constructor', () => {
    it('should create an action with tool name and args', () => {
      const action = new Action('readFile', { fileName: 'test.txt' });
      expect(action.toolName).toBe('readFile');
      expect(action.args).toEqual({ fileName: 'test.txt' });
    });

    it('should default args to empty object', () => {
      const action = new Action('listFiles');
      expect(action.args).toEqual({});
    });
  });

  describe('getArg', () => {
    it('should get argument by name', () => {
      const action = new Action('readFile', { fileName: 'test.txt', encoding: 'utf8' });
      expect(action.getArg<string>('fileName')).toBe('test.txt');
      expect(action.getArg<string>('encoding')).toBe('utf8');
    });

    it('should return undefined for missing argument', () => {
      const action = new Action('test', { a: 1 });
      expect(action.getArg('missing')).toBeUndefined();
    });

    it('should validate with validator function', () => {
      const action = new Action('test', { count: 42, name: 'test' });

      const isNumber = (v: unknown): v is number => typeof v === 'number';

      expect(action.getArg('count', isNumber)).toBe(42);
      expect(action.getArg('name', isNumber)).toBeUndefined();
    });
  });

  describe('requireArg', () => {
    it('should return value if present', () => {
      const action = new Action('test', { required: 'value' });
      expect(action.requireArg<string>('required')).toBe('value');
    });

    it('should throw if argument missing', () => {
      const action = new Action('test', {});
      expect(() => action.requireArg('missing')).toThrow('Missing required argument: missing');
    });
  });

  describe('isTerminate and isError', () => {
    it('should detect terminate action', () => {
      const terminate = new Action('terminate', { message: 'done' });
      const other = new Action('readFile', {});

      expect(terminate.isTerminate()).toBe(true);
      expect(other.isTerminate()).toBe(false);
    });

    it('should detect error action', () => {
      const error = new Action('error', { message: 'failed' });
      const other = new Action('readFile', {});

      expect(error.isError()).toBe(true);
      expect(other.isError()).toBe(false);
    });
  });

  describe('factory methods', () => {
    it('should create terminate action', () => {
      const action = Action.terminate('All done');
      expect(action.toolName).toBe('terminate');
      expect(action.getArg('message')).toBe('All done');
    });

    it('should create error action', () => {
      const action = Action.error('Something failed');
      expect(action.toolName).toBe('error');
      expect(action.getArg('message')).toBe('Something failed');
    });
  });

  describe('serialization', () => {
    it('should convert to JSON', () => {
      const action = new Action('readFile', { fileName: 'test.txt' });
      expect(action.toJSON()).toEqual({
        tool: 'readFile',
        args: { fileName: 'test.txt' },
      });
    });

    it('should parse from JSON with tool field', () => {
      const json = { tool: 'listFiles', args: {} };
      const action = Action.fromJSON(json);
      expect(action.toolName).toBe('listFiles');
    });

    it('should parse from JSON with toolName field', () => {
      const json = { toolName: 'listFiles', args: {} };
      const action = Action.fromJSON(json);
      expect(action.toolName).toBe('listFiles');
    });

    it('should throw if no tool name in JSON', () => {
      expect(() => Action.fromJSON({ args: {} })).toThrow();
    });

    it('should have readable toString', () => {
      const action = new Action('readFile', { fileName: 'test.txt' });
      const str = action.toString();
      expect(str).toContain('readFile');
      expect(str).toContain('test.txt');
    });
  });
});
