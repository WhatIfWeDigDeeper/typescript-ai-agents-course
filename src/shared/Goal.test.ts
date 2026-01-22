/**
 * Tests for Goal class.
 */

import { Goal } from './Goal';

describe('Goal', () => {
  describe('constructor', () => {
    it('should create goal with name, description, and priority', () => {
      const goal = new Goal('test', 'Test goal', 5);
      expect(goal.name).toBe('test');
      expect(goal.description).toBe('Test goal');
      expect(goal.priority).toBe(5);
    });

    it('should default priority to 0', () => {
      const goal = new Goal('test', 'Test goal');
      expect(goal.priority).toBe(0);
    });

    it('should start as not completed', () => {
      const goal = new Goal('test', 'Test goal');
      expect(goal.completed).toBe(false);
    });
  });

  describe('completion', () => {
    it('should mark as completed', () => {
      const goal = new Goal('test', 'Test goal');
      goal.complete();
      expect(goal.completed).toBe(true);
    });

    it('should reset to not completed', () => {
      const goal = new Goal('test', 'Test goal');
      goal.complete();
      goal.reset();
      expect(goal.completed).toBe(false);
    });
  });

  describe('static methods', () => {
    it('should sort by priority (highest first)', () => {
      const goals = [
        new Goal('low', 'Low', 1),
        new Goal('high', 'High', 10),
        new Goal('med', 'Medium', 5),
      ];

      const sorted = Goal.sortByPriority(goals);
      expect(sorted[0].name).toBe('high');
      expect(sorted[1].name).toBe('med');
      expect(sorted[2].name).toBe('low');
    });

    it('should not mutate original array when sorting', () => {
      const goals = [
        new Goal('a', 'A', 1),
        new Goal('b', 'B', 2),
      ];

      const sorted = Goal.sortByPriority(goals);
      expect(goals[0].name).toBe('a');
      expect(sorted[0].name).toBe('b');
    });

    it('should filter incomplete goals', () => {
      const goals = [
        new Goal('done', 'Done', 1),
        new Goal('pending', 'Pending', 2),
      ];
      goals[0].complete();

      const incomplete = Goal.incomplete(goals);
      expect(incomplete.length).toBe(1);
      expect(incomplete[0].name).toBe('pending');
    });

    it('should get next goal (highest priority incomplete)', () => {
      const goals = [
        new Goal('high', 'High', 10),
        new Goal('med', 'Medium', 5),
        new Goal('low', 'Low', 1),
      ];
      goals[0].complete(); // Complete the high priority one

      const next = Goal.nextGoal(goals);
      expect(next?.name).toBe('med');
    });

    it('should return undefined if all goals complete', () => {
      const goals = [new Goal('test', 'Test', 1)];
      goals[0].complete();

      expect(Goal.nextGoal(goals)).toBeUndefined();
    });
  });

  describe('serialization', () => {
    it('should convert to JSON', () => {
      const goal = new Goal('test', 'Test goal', 5);
      expect(goal.toJSON()).toEqual({
        name: 'test',
        description: 'Test goal',
        priority: 5,
        completed: false,
      });
    });

    it('should include completed status in JSON', () => {
      const goal = new Goal('test', 'Test goal', 5);
      goal.complete();
      expect(goal.toJSON().completed).toBe(true);
    });

    it('should create from JSON', () => {
      const json = {
        name: 'restored',
        description: 'Restored goal',
        priority: 3,
        completed: true,
      };

      const goal = Goal.fromJSON(json);
      expect(goal.name).toBe('restored');
      expect(goal.priority).toBe(3);
      expect(goal.completed).toBe(true);
    });

    it('should have readable toString', () => {
      const goal = new Goal('test', 'Test goal', 5);
      const str = goal.toString();
      expect(str).toContain('test');
      expect(str).toContain('p5');
      expect(str).toContain('○'); // Not completed
    });

    it('should show checkmark when completed', () => {
      const goal = new Goal('test', 'Test goal', 5);
      goal.complete();
      expect(goal.toString()).toContain('✓');
    });

    it('should format multiple goals for LLM', () => {
      const goals = [
        new Goal('first', 'First goal', 10),
        new Goal('second', 'Second goal', 5),
      ];

      const formatted = Goal.formatForLLM(goals);
      expect(formatted).toContain('1.');
      expect(formatted).toContain('2.');
      expect(formatted).toContain('first');
      expect(formatted).toContain('Priority: 10');
    });

    it('should handle empty goals array in formatForLLM', () => {
      expect(Goal.formatForLLM([])).toBe('No goals defined.');
    });
  });
});
