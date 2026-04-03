import { TextContainerProperty } from '@evenrealities/even_hub_sdk';
import { DISPLAY_WIDTH, DISPLAY_HEIGHT } from '../../utils/constants';
import { rightAlign, separator, truncate, pad, LINE_WIDTH } from '../../utils/glass-text';
import type { Departure } from '../../types';
import type { AppSnapshot, AppAction, ScreenContext } from '../shared';

function renderDeparture(dep: Departure, highlighted: boolean): string {
  const cursor = highlighted ? '▶ ' : '  ';

  // Line 1: time, platform, status
  let status = 'ON TIME';
  if (dep.isCancelled) status = 'CANCELLED';
  else if (dep.delayMinutes > 0) status = `⚠ +${dep.delayMinutes} min`;

  const line1Left = `${cursor}${dep.scheduledTime}   Platform ${dep.platform}`;
  const line1 = rightAlign(line1Left, status);

  // Line 2: arrival info
  const arrInfo = dep.estimatedArrival
    ? `Arrives ${dep.estimatedArrival}`
    : '';
  const typeInfo = dep.routeName || dep.mode;
  const line2 = `  ${arrInfo}  · ${typeInfo}`;

  return line1 + '\n' + truncate(line2, LINE_WIDTH);
}

function renderContent(snapshot: AppSnapshot): string {
  const lines: string[] = [];

  // Header
  const refreshStr = snapshot.lastRefresh
    ? `[${new Date(snapshot.lastRefresh).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}]`
    : '[live]';
  lines.push(rightAlign(snapshot.routeLabel, refreshStr));
  lines.push(separator());

  // Departures
  const deps = snapshot.departures.slice(0, 3);
  if (deps.length === 0) {
    lines.push('');
    lines.push('  No departures found.');
    lines.push('');
    lines.push('  Double-press to refresh.');
  } else {
    for (let i = 0; i < deps.length; i++) {
      if (i > 0) lines.push('');
      lines.push(renderDeparture(deps[i], i === snapshot.highlightedIndex));
    }
  }

  // Pad to fill screen, then action bar
  while (lines.length < 9) lines.push('');
  lines.push(rightAlign('↑↓ Navigate  ● Select', '●● Refresh'));

  return lines.join('\n');
}

export const departureBoardScreen = {
  containers(snapshot: AppSnapshot) {
    return [
      new TextContainerProperty({
        xPosition: 0,
        yPosition: 0,
        width: DISPLAY_WIDTH,
        height: DISPLAY_HEIGHT,
        containerID: 1,
        containerName: 'depBoard',
        isEventCapture: 1,
        content: renderContent(snapshot),
        paddingLength: 4,
      }),
    ];
  },

  updates(snapshot: AppSnapshot) {
    return [{ containerID: 1, containerName: 'depBoard', content: renderContent(snapshot) }];
  },

  action(action: AppAction, snapshot: AppSnapshot, ctx: ScreenContext) {
    switch (action.type) {
      case 'SCROLL_UP':
        ctx.dispatch({ type: 'MOVE_HIGHLIGHT', direction: 'up' });
        break;
      case 'SCROLL_DOWN':
        ctx.dispatch({ type: 'MOVE_HIGHLIGHT', direction: 'down' });
        break;
      case 'SELECT': {
        const dep = snapshot.departures[snapshot.highlightedIndex];
        if (dep) {
          ctx.dispatch({ type: 'SELECT_DEPARTURE', departure: dep });
          ctx.navigate('train_detail');
        }
        break;
      }
      case 'BACK':
        ctx.dispatch({ type: 'FORCE_REFRESH' });
        break;
    }
  },
};
