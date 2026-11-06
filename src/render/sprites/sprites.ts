import type { GameConfig } from '../../engine/config/gameConfig';
import type { SpriteId } from '../../engine/core/interfaces';
import type { PaletteKey } from '../../theme/palette';
import type { Sprite } from './Sprite';

// Bricks are drawn one pixel smaller than their cell, leaving a gap.
// l = highlight, d = shadow, # = brick color, c = crack, o = rivet.
const BRICK = [
  'lllllllllllllllllllllld',
  'l#####################d',
  'l#####################d',
  'l#####################d',
  'l#####################d',
  'l#####################d',
  'ddddddddddddddddddddddd',
];

const BRICK_CRACKED = [
  'lllllllllllllllllllllld',
  'l#########c###########d',
  'l########c############d',
  'l#########cc##########d',
  'l###########c#########d',
  'l##########c##########d',
  'ddddddddddddddddddddddd',
];

const BRICK_METAL = [
  'lllllllllllllllllllllld',
  'l#o#################o#d',
  'l#####################d',
  'l#####################d',
  'l#####################d',
  'l#o#################o#d',
  'ddddddddddddddddddddddd',
];

function brick(rows: readonly string[], color: PaletteKey): Sprite {
  return {
    rows,
    legend: { l: 'light', d: 'shadow', '#': color, c: 'shadow', o: 'light' },
  };
}

// The paddle is stretched: left cap, a repeated middle column, right cap.
const PADDLE_LEFT = ['.cc', 'clc', 'ccc', 'ccc', 'cdc', '.cc'];
const PADDLE_MIDDLE = ['l', '#', '#', '#', 's', 'd'];
const PADDLE_RIGHT = ['cc.', 'clc', 'ccc', 'ccc', 'cdc', 'cc.'];

function paddle(width: number, laser: boolean): Sprite {
  const middle = width - PADDLE_LEFT[0]!.length - PADDLE_RIGHT[0]!.length;
  return {
    rows: PADDLE_LEFT.map(
      (left, i) =>
        left +
        (PADDLE_MIDDLE[i] ?? '').repeat(middle) +
        (PADDLE_RIGHT[i] ?? ''),
    ),
    legend: {
      c: 'paddleCap',
      l: 'light',
      '#': laser ? 'paddleLaser' : 'paddle',
      s: 'paddleShade',
      d: 'shadow',
    },
  };
}

const BALL: Sprite = {
  rows: ['.bbbb.', 'bbbbbb', 'bbbbbs', 'bbbbbs', 'bbbbss', '.ssss.'],
  legend: { b: 'ball', s: 'ballShade' },
};

const BULLET: Sprite = {
  rows: ['ll', 'bb', 'bb', 'bb', 'bb'],
  legend: { l: 'light', b: 'bullet' },
};

// 3×5 letters printed on the capsules.
const LETTERS = {
  W: ['x.x', 'x.x', 'xxx', 'xxx', 'x.x'],
  M: ['x.x', 'xxx', 'xxx', 'x.x', 'x.x'],
  S: ['xxx', 'x..', 'xxx', '..x', 'xxx'],
  L: ['x..', 'x..', 'x..', 'x..', 'xxx'],
} as const;

function capsule(letter: keyof typeof LETTERS, color: PaletteKey): Sprite {
  const edge = '.dddddddddddddd.';
  return {
    rows: [
      edge,
      ...LETTERS[letter].map((line) => `d#####${line}######d`),
      edge,
    ],
    legend: { d: 'shadow', '#': color, x: 'capsuleLetter' },
  };
}

/** All sprites. Paddle sizes follow the configured widths. */
export function createSprites(config: GameConfig): Record<SpriteId, Sprite> {
  const normal = config.paddle.width;
  const wide = Math.round(normal * config.powerUps.wideFactor);
  return {
    brick1: brick(BRICK, 'brick1'),
    brick2: brick(BRICK, 'brick2'),
    brick3: brick(BRICK, 'brick3'),
    brick4: brick(BRICK, 'brick4'),
    brickSilver: brick(BRICK, 'brickSilver'),
    brickSilverCracked: brick(BRICK_CRACKED, 'brickSilver'),
    brickMetal: brick(BRICK_METAL, 'brickMetal'),
    paddle: paddle(normal, false),
    paddleWide: paddle(wide, false),
    paddleLaser: paddle(normal, true),
    paddleWideLaser: paddle(wide, true),
    ball: BALL,
    capsuleWide: capsule('W', 'powerWide'),
    capsuleMulti: capsule('M', 'powerMulti'),
    capsuleSlow: capsule('S', 'powerSlow'),
    capsuleLaser: capsule('L', 'powerLaser'),
    bullet: BULLET,
  };
}
