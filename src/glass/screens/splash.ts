import { TextContainerProperty } from '@evenrealities/even_hub_sdk';
import { DISPLAY_WIDTH, DISPLAY_HEIGHT } from '../../utils/constants';
import type { AppSnapshot, AppAction, ScreenContext } from '../shared';

const SPLASH_CONTENT = [
  '',
  '',
  '  ──────────────────────────────',
  '',
  '        C O M M U T E',
  '        ─────────────',
  '    Smart Commute HUD',
  '',
  '  ──────────────────────────────',
  '',
  '     Loading departures...',
].join('\n');

export const splashScreen = {
  containers(_snapshot: AppSnapshot) {
    return [
      new TextContainerProperty({
        xPosition: 0,
        yPosition: 0,
        width: DISPLAY_WIDTH,
        height: DISPLAY_HEIGHT,
        containerID: 1,
        containerName: 'splash',
        isEventCapture: 1,
        content: SPLASH_CONTENT,
      }),
    ];
  },

  updates(snapshot: AppSnapshot) {
    const content = snapshot.error
      ? SPLASH_CONTENT.replace('Loading departures...', `⚠ ${snapshot.error}`)
      : SPLASH_CONTENT;
    return [{ containerID: 1, containerName: 'splash', content }];
  },

  action(_action: AppAction, _snapshot: AppSnapshot, _ctx: ScreenContext) {
    // No input during splash
  },
};
