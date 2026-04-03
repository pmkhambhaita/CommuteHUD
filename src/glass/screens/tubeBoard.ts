import { TextContainerProperty } from '@evenrealities/even_hub_sdk';
import { DISPLAY_WIDTH, DISPLAY_HEIGHT } from '../../utils/constants';
import { rightAlign, separator, truncate, pad, LINE_WIDTH } from '../../utils/glass-text';
import type { AppSnapshot, AppAction, ScreenContext } from '../shared';

function renderContent(snapshot: AppSnapshot): string {
  const lines: string[] = [];

  const refreshStr = snapshot.tubeLastRefresh
    ? new Date(snapshot.tubeLastRefresh).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : '...';
  lines.push(rightAlign('TUBE BOARD', `[${refreshStr}]`));
  lines.push(separator());

  if (snapshot.tubeLines.length === 0) {
    lines.push('');
    lines.push('  Loading tube arrivals...');
    lines.push('');
  } else {
    for (const line of snapshot.tubeLines.slice(0, 5)) {
      const name = pad(truncate(line.lineName, 13), 13);
      const times = line.arrivals
        .slice(0, 3)
        .map((a) => a.departureTime || '--')
        .join(' · ');
      lines.push(`${name} ${times}`);
    }
  }

  // Pad and action bar
  while (lines.length < 9) lines.push('');
  lines.push(rightAlign('● Refresh', '●● Back'));

  return lines.join('\n');
}

export const tubeBoardScreen = {
  containers(snapshot: AppSnapshot) {
    return [
      new TextContainerProperty({
        xPosition: 0,
        yPosition: 0,
        width: DISPLAY_WIDTH,
        height: DISPLAY_HEIGHT,
        containerID: 1,
        containerName: 'tubeBoard',
        isEventCapture: 1,
        content: renderContent(snapshot),
        paddingLength: 4,
      }),
    ];
  },

  updates(snapshot: AppSnapshot) {
    return [{ containerID: 1, containerName: 'tubeBoard', content: renderContent(snapshot) }];
  },

  action(action: AppAction, _snapshot: AppSnapshot, ctx: ScreenContext) {
    switch (action.type) {
      case 'SELECT':
        ctx.dispatch({ type: 'FORCE_REFRESH_TUBE' });
        break;
      case 'BACK':
        ctx.navigate('journey_active');
        break;
    }
  },
};
