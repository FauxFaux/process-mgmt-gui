export type ModifierStyle = 'raw' | 'normal' | 'additional';
export type DirectMultiplier = number;

export interface Modifier {
  mode: ModifierStyle;
  /** this is stored non-inverted, e.g. for productivity; 1.25 -> 25% extra output;
   * that is, you must invert it for a duration: 1/1.25 * 5s = 4s */
  amount: DirectMultiplier;
}

export const modifierFromInput = (
  mode: ModifierStyle,
  input: number,
): Modifier => {
  return {
    mode,
    amount: convertFromInput(mode, input),
  };
};

export const convertFromInput = (
  mode: ModifierStyle,
  input: number,
): DirectMultiplier => {
  switch (mode) {
    case 'raw':
      return input;
    case 'normal':
      return input / 100;
    case 'additional':
      return input / 100 + 1;
  }
};

export const modifierToInput = (mod: Modifier): number => {
  switch (mod.mode) {
    case 'raw':
      return mod.amount;
    case 'normal':
      return mod.amount * 100;
    case 'additional':
      return (mod.amount - 1) * 100;
  }
};
