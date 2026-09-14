export interface MaskedValueProps {
  value: string;
  /** Screen-reader name for controls. Never pass the secret value. */
  label: string;
  /** Non-secret values render visibly with only a copy control. */
  secret?: boolean;
  revealSeconds?: number;
  compact?: boolean;
  wrap?: boolean;
}
