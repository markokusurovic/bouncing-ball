export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Velocity pointing upwards, tilted by `angleFromVertical` radians
 * (positive tilts right). Screen y grows downwards.
 */
export function upwardVelocity(angleFromVertical: number, speed: number): Vec2 {
  return {
    x: speed * Math.sin(angleFromVertical),
    y: -speed * Math.cos(angleFromVertical),
  };
}
