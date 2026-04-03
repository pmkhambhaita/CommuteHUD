import { TextContainerProperty } from '@evenrealities/even_hub_sdk';
import { DISPLAY_WIDTH, DISPLAY_HEIGHT, HEADER_HEIGHT, BODY_Y, BODY_HEIGHT } from '../../utils/constants';
import { formatHeader, separator, truncate, formatTwoColumn, LINE_WIDTH } from '../../utils/glass-text';
import { timeSinceString } from '../../utils/time';
import type { AppSnapshot, AppAction } from '../shared';
import type { Departure } from '../../types';

function renderDepartureBlock(dep: Departure, isHighlighted: boolean): string {
  const cursor = isHighlighted ? '▶' : ' ';
  // Line 1: departure time, platform, delay
  let delayLabel = 'ON TIME';
  if (dep.isCancelled) delayLabel = 'CANCELLED';
  else if (dep.delayMinutes > 0) delayLabel = `⚠ +${dep.delayMinutes}m`;

  const line1Left = `${cursor} ${dep.scheduledTime}  Plat ${dep.platform}`;
  const line1 = formatTwoColumn(line1Left, delayLabel);

  // Line 2: journey type, duration, arrival
  const line2Left = `  ${dep.journeyType} · ${dep.duration}min`;
  const line2Right = `arr ${dep.estimatedArrival}`;
  const line2 = formatTwoColumn(line2Left, line2Right);

  // Line 3: operator
  const line3 = `  ${truncate(dep.operator, LINE_WIDTH - 2)}`;

  return [line1, line2, line3].join('\n');
}

function renderBody(snapshot: AppSnapshot): string {
  const deps = snapshot.departures.slice(0, 3);
  if (deps.length === 0) {
    return '\n\n     No departures found.\n\n     Double-press to refresh.';
  }

  const blocks = deps.map((dep, i) =>
    renderDepartureBlock(dep, i === snapshot.highlightedIndex),
  );

  const lines = blocks.join('\n' + separator() + '\n');
  const actionBar = '↑↓ Navigate    ● Select    ●● Refresh';
  return lines + '\n' + separator() + '\n' + actionBar;
}

function renderHeader(snapshot: AppSnapshot): string {
  const refreshStr = snapshot.lastRefresh ? timeSinceString(snapshot.lastRefresh) : '...';
  return formatHeader(snapshot.routeLabel, refreshStr);
}

export const departureBoardScreen = {
  containers(snapshot: AppSnapshot) {
    return [
      new TextContainerProperty({
        xPosition: 0,
        yPosition: 0,
        width: DISPLAY_WIDTH,
        height: HEADER_HEIGHT,
        containerID: 1,
        containerName: 'dbHeader',
        isEventCapture: 0,
        content: renderHeader(snapshot),
        borderWidth: 0,
        paddingLength: 2,
      }),
      new TextContainerProperty({
        xPosition: 0,
        yPosition: BODY_Y,
        width: DISPLAY_WIDTH,
        height: BODY_HEIGHT,
        containerID: 2,
        containerName: 'dbBody',
        isEventCapture: 1,
        content: renderBody(snapshot),
        borderWidth: 0,
        paddingLength: 2,
      }),
    ];
  },

  updates(snapshot: AppSnapshot) {
    const headerContent = renderHeader(snapshot);
    const bodyContent = renderBody(snapshot);
    return [
      { containerID: 1, containerName: 'dbHeader', content: headerContent },
      { containerID: 2, containerName: 'dbBody', content: bodyContent },
    ];
  },

  action(action: AppAction, nav: any, snapshot: AppSnapshot, ctx: any) {
    switch (action.type) {
      case 'SCROLL_UP':
        ctx.dispatch?.({ type: 'MOVE_HIGHLIGHT', direction: 'up' });
        return nav;
      case 'SCROLL_DOWN':
        ctx.dispatch?.({ type: 'MOVE_HIGHLIGHT', direction: 'down' });
        return nav;
      case 'SELECT': {
        const dep = snapshot.departures[snapshot.highlightedIndex];
        if (dep) {
          ctx.dispatch?.({ type: 'SELECT_DEPARTURE', departure: dep });
          ctx.navigate('train_detail');
        }
        return nav;
      }
      case 'REFRESH':
        ctx.dispatch?.({ type: 'FORCE_REFRESH' });
        return nav;
      default:
        return nav;
    }
  },
};
