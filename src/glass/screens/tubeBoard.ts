import { TextContainerProperty } from '@evenrealities/even_hub_sdk';
import { DISPLAY_WIDTH, DISPLAY_HEIGHT } from '../../utils/constants';
import { formatHeader, separator, truncate, padRight, LINE_WIDTH } from '../../utils/glass-text';
import { formatSecondsAsMinutes, timeSinceString } from '../../utils/time';
import type { AppSnapshot, AppAction } from '../shared';

function renderContent(snapshot: AppSnapshot): string {
  const lines: string[] = [];
  const refreshStr = snapshot.tubeLastRefresh ? timeSinceString(snapshot.tubeLastRefresh) : '...';
  lines.push(formatHeader('TUBE BOARD', refreshStr));
  lines.push(separator());

  if (snapshot.tubeLines.length === 0) {
    lines.push('');
    lines.push('  Loading tube arrivals...');
    lines.push('');
    lines.push('  ● Refresh    ●● Back');
    return lines.join('\n');
  }

  for (const line of snapshot.tubeLines) {
    const namePadded = padRight(truncate(line.lineName, 12), 12);
    const arrivals = line.arrivals.slice(0, 3);
    const timeParts = arrivals.map((a) => formatSecondsAsMinutes(a.timeToStation));
    const timeStr = timeParts.join(' · ');
    lines.push(`${namePadded} ${timeStr}`);
  }

  lines.push(separator());
  lines.push('● Refresh    ●● Back');

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
        containerName: 'tube',
        isEventCapture: 1,
        content: renderContent(snapshot),
        paddingLength: 2,
      }),
    ];
  },

  updates(snapshot: AppSnapshot) {
    return [
      { containerID: 1, containerName: 'tube', content: renderContent(snapshot) },
    ];
  },

  action(action: AppAction, nav: any, _snapshot: AppSnapshot, ctx: any) {
    switch (action.type) {
      case 'SELECT':
        ctx.dispatch?.({ type: 'FORCE_REFRESH_TUBE' });
        return nav;
      case 'BACK':
        ctx.navigate('journey_active');
        return nav;
      default:
        return nav;
    }
  },
};
