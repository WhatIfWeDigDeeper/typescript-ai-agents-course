/**
 * Tests for ActionResult.
 */

import { ActionResult } from './ActionResult';

describe('ActionResult', () => {
  describe('success', () => {
    it('should create successful result', () => {
      const result = ActionResult.success('data');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('data');
      }
    });

    it('should work with complex values', () => {
      const data = { files: ['a.txt', 'b.txt'], count: 2 };
      const result = ActionResult.success(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual(data);
      }
    });
  });

  describe('error', () => {
    it('should create error result', () => {
      const result = ActionResult.error('Something went wrong');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Something went wrong');
      }
    });
  });

  describe('fromPromise', () => {
    it('should wrap successful promise', async () => {
      const promise = Promise.resolve('async data');
      const result = await ActionResult.fromPromise(promise);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('async data');
      }
    });

    it('should catch rejected promise', async () => {
      const promise = Promise.reject(new Error('Async error'));
      const result = await ActionResult.fromPromise(promise);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Async error');
      }
    });

    it('should handle non-Error rejections', async () => {
      const promise = Promise.reject('string error');
      const result = await ActionResult.fromPromise(promise);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('string error');
      }
    });
  });

  describe('fromTry', () => {
    it('should wrap successful function', () => {
      const result = ActionResult.fromTry(() => 42);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(42);
      }
    });

    it('should catch thrown error', () => {
      const result = ActionResult.fromTry(() => {
        throw new Error('Sync error');
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Sync error');
      }
    });
  });

  describe('type guards', () => {
    it('should correctly identify success', () => {
      const success = ActionResult.success('data');
      const error = ActionResult.error('error');

      expect(ActionResult.isSuccess(success)).toBe(true);
      expect(ActionResult.isSuccess(error)).toBe(false);
    });

    it('should correctly identify error', () => {
      const success = ActionResult.success('data');
      const error = ActionResult.error('error');

      expect(ActionResult.isError(success)).toBe(false);
      expect(ActionResult.isError(error)).toBe(true);
    });
  });

  describe('toJSON', () => {
    it('should convert success to JSON format', () => {
      const result = ActionResult.success({ key: 'value' });
      const json = ActionResult.toJSON(result);
      expect(json).toEqual({ result: { key: 'value' } });
    });

    it('should convert error to JSON format', () => {
      const result = ActionResult.error('failed');
      const json = ActionResult.toJSON(result);
      expect(json).toEqual({ error: 'failed' });
    });
  });
});
