export type ModifierStyle = 'raw' | 'normal' | 'additional';
export type DirectMultiplier = number;

export interface Modifier {
  mode: ModifierStyle;
  amount: DirectMultiplier;
}
