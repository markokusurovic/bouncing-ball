/**
 * Every color in the game lives here. Never hard-code a color anywhere else.
 */
export const palette = {
  /** Page background around the game canvas. */
  pageBackground: '#0b0b14',
  /** Background of the playfield. */
  playfield: '#1a1c2c',
  /** Frame drawn around the scaled canvas. */
  canvasBorder: '#333c57',
  paddle: '#41a6f6',
  ball: '#f4f4f4',
  brick1: '#b13e53',
  brick2: '#ef7d57',
  brick3: '#ffcd75',
  brick4: '#38b764',
  brickSilver: '#94b0c2',
  brickMetal: '#566c86',
  hudText: '#f4f4f4',
  hudAccent: '#ffcd75',
} as const;

export type PaletteKey = keyof typeof palette;
