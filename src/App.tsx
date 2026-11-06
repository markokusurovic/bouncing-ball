import type { ReactElement } from 'react';
import { palette } from './theme/palette';
import { GameCanvas } from './ui/GameCanvas';

export function App(): ReactElement {
  return (
    <main
      className="flex min-h-screen items-center justify-center"
      style={{ backgroundColor: palette.pageBackground }}
    >
      <GameCanvas />
    </main>
  );
}
