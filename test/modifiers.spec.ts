import { expect, it } from '@jest/globals';

import {
  modifierFromInput,
  ModifierStyle,
  modifierToInput,
} from '../src/modifiers';

it('round-trips modifiers to input', () => {
  const mi = (mode: ModifierStyle, amount: number) =>
    modifierToInput({ mode, amount });
  expect(mi('raw', 0.5)).toBe(0.5);
  expect(mi('raw', 1)).toBe(1);
  expect(mi('raw', 2.5)).toBe(2.5);

  expect(mi('normal', 0.5)).toBe(50);
  expect(mi('normal', 1)).toBe(100);
  expect(mi('normal', 2.5)).toBe(250);

  expect(mi('additional', 0.5)).toBe(-50);
  expect(mi('additional', 1)).toBe(0);
  expect(mi('additional', 2.5)).toBe(150);

  const mo = (mode: ModifierStyle, input: number) =>
    modifierFromInput(mode, input).amount;
  expect(mo('raw', 0.5)).toEqual(0.5);
  expect(mo('raw', 1)).toEqual(1);
  expect(mo('raw', 2.5)).toEqual(2.5);

  expect(mo('normal', 50)).toEqual(0.5);
  expect(mo('normal', 100)).toEqual(1);
  expect(mo('normal', 250)).toEqual(2.5);

  expect(mo('additional', -50)).toEqual(0.5);
  expect(mo('additional', 0)).toEqual(1);
  expect(mo('additional', 150)).toEqual(2.5);
});
