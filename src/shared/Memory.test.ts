/**
 * Tests for Memory class.
 */

import { Memory } from './Memory';

describe('Memory', () => {
  describe('basic operations', () => {
    it('should store and retrieve values', () => {
      const memory = new Memory();
      memory.set('key', 'value');
      expect(memory.get<string>('key')).toBe('value');
    });

    it('should return undefined for missing keys', () => {
      const memory = new Memory();
      expect(memory.get('missing')).toBeUndefined();
    });

    it('should check key existence', () => {
      const memory = new Memory();
      memory.set('exists', true);
      expect(memory.has('exists')).toBe(true);
      expect(memory.has('missing')).toBe(false);
    });

    it('should delete keys', () => {
      const memory = new Memory();
      memory.set('key', 'value');
      expect(memory.delete('key')).toBe(true);
      expect(memory.has('key')).toBe(false);
    });

    it('should clear all values', () => {
      const memory = new Memory();
      memory.set('a', 1);
      memory.set('b', 2);
      memory.clear();
      expect(memory.size).toBe(0);
    });

    it('should return all keys', () => {
      const memory = new Memory();
      memory.set('a', 1);
      memory.set('b', 2);
      expect(memory.keys()).toEqual(expect.arrayContaining(['a', 'b']));
    });
  });

  describe('require', () => {
    it('should return value if present', () => {
      const memory = new Memory();
      memory.set('key', 'value');
      expect(memory.require<string>('key')).toBe('value');
    });

    it('should throw if key missing', () => {
      const memory = new Memory();
      expect(() => memory.require('missing')).toThrow('Memory key not found: missing');
    });
  });

  describe('convenience methods', () => {
    it('should append to arrays', () => {
      const memory = new Memory();
      memory.append('list', 'a');
      memory.append('list', 'b');
      expect(memory.get<string[]>('list')).toEqual(['a', 'b']);
    });

    it('should increment numbers', () => {
      const memory = new Memory();
      expect(memory.increment('counter')).toBe(1);
      expect(memory.increment('counter')).toBe(2);
      expect(memory.increment('counter', 5)).toBe(7);
    });

    it('should get with default', () => {
      const memory = new Memory();
      expect(memory.getOrDefault('missing', 'default')).toBe('default');
      memory.set('exists', 'value');
      expect(memory.getOrDefault('exists', 'default')).toBe('value');
    });
  });

  describe('serialization', () => {
    it('should convert to object', () => {
      const memory = new Memory();
      memory.set('a', 1);
      memory.set('b', 'two');
      expect(memory.toObject()).toEqual({ a: 1, b: 'two' });
    });

    it('should convert to JSON string', () => {
      const memory = new Memory();
      memory.set('key', 'value');
      const json = memory.toJSON();
      expect(JSON.parse(json)).toEqual({ key: 'value' });
    });

    it('should create from object', () => {
      const memory = Memory.fromObject({ a: 1, b: 2 });
      expect(memory.get('a')).toBe(1);
      expect(memory.get('b')).toBe(2);
    });

    it('should initialize from constructor', () => {
      const memory = new Memory({ initial: 'value' });
      expect(memory.get('initial')).toBe('value');
    });

    it('should have readable toString', () => {
      const memory = new Memory();
      memory.set('name', 'Alice');
      memory.set('count', 42);
      const str = memory.toString();
      expect(str).toContain('name');
      expect(str).toContain('Alice');
    });

    it('should show (empty) for empty memory', () => {
      const memory = new Memory();
      expect(memory.toString()).toBe('(empty)');
    });
  });
});
