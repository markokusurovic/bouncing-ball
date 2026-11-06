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
} as const;

export type PaletteKey = keyof typeof palette;
