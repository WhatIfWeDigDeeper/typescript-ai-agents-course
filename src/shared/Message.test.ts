/**
 * Tests for Message class.
 */

import { Message, Role } from './Message';

describe('Message', () => {
  describe('constructor', () => {
    it('should create a message with role and content', () => {
      const msg = new Message('user', 'Hello');
      expect(msg.role).toBe('user');
      expect(msg.content).toBe('Hello');
    });

    it('should have readonly properties', () => {
      const msg = new Message('system', 'You are helpful');
      // TypeScript should prevent: msg.role = 'user';
      expect(msg.role).toBe('system');
    });
  });

  describe('factory methods', () => {
    it('should create system message', () => {
      const msg = Message.system('Instructions');
      expect(msg.role).toBe('system');
      expect(msg.content).toBe('Instructions');
    });

    it('should create user message', () => {
      const msg = Message.user('Hello');
      expect(msg.role).toBe('user');
      expect(msg.content).toBe('Hello');
    });

    it('should create assistant message', () => {
      const msg = Message.assistant('Hi there');
      expect(msg.role).toBe('assistant');
      expect(msg.content).toBe('Hi there');
    });
  });

  describe('serialization', () => {
    it('should convert to JSON', () => {
      const msg = new Message('user', 'Test');
      const json = msg.toJSON();
      expect(json).toEqual({ role: 'user', content: 'Test' });
    });

    it('should create from JSON', () => {
      const json = { role: 'assistant' as Role, content: 'Response' };
      const msg = Message.fromJSON(json);
      expect(msg.role).toBe('assistant');
      expect(msg.content).toBe('Response');
    });

    it('should have readable toString', () => {
      const msg = new Message('user', 'Short message');
      expect(msg.toString()).toBe('[user]: Short message');
    });

    it('should truncate long messages in toString', () => {
      const longContent = 'a'.repeat(100);
      const msg = new Message('user', longContent);
      const str = msg.toString();
      expect(str).toContain('...');
      expect(str.length).toBeLessThan(100);
    });
  });
});
