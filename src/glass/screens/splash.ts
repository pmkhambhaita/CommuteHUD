import { TextContainerProperty } from '@evenrealities/even_hub_sdk';
import { DISPLAY_WIDTH, DISPLAY_HEIGHT } from '../../utils/constants';
import type { AppSnapshot } from '../shared';
import type { AppAction } from '../shared';

const SPLASH_CONTENT = [
  '',
  '',
  '        ╔═══════════════════════╗',
  '        ║       COMMUTE         ║',
  '        ║     ━━━━━━━━━━━━      ║',
  '        ║  Smart Commute HUD    ║',
  '        ╚═══════════════════════╝',
  '',
  '         Loading departures...',
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

  updates(_snapshot: AppSnapshot) {
    return [];
  },

  action(_action: AppAction, _nav: any, _snapshot: AppSnapshot, _ctx: any) {
    // No input handling during splash
    return _nav;
  },
};
