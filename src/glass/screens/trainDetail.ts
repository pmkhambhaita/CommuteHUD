import { TextContainerProperty } from '@evenrealities/even_hub_sdk';
import {
  DISPLAY_WIDTH,
  DISPLAY_HEIGHT,
  HEADER_HEIGHT,
  BODY_Y,
  ACTION_BAR_HEIGHT,
} from '../../utils/constants';
import { formatHeader, separator, truncate, formatTwoColumn, wrapText, LINE_WIDTH } from '../../utils/glass-text';
import type { AppSnapshot, AppAction } from '../shared';

const VISIBLE_STOPS = 4;
const BODY_HEIGHT = DISPLAY_HEIGHT - HEADER_HEIGHT - ACTION_BAR_HEIGHT;

function renderHeader(snapshot: AppSnapshot): string {
  const dep = snapshot.selectedDeparture;
  if (!dep) return 'No service selected';
  return formatHeader(`${dep.scheduledTime} to ${truncate(dep.destination, 20)}`, `Plat ${dep.platform}`);
}

function renderBody(snapshot: AppSnapshot): string {
  const detail = snapshot.serviceDetail;
  const dep = snapshot.selectedDeparture;
  if (!detail) return '\n  Loading service details...';

  const lines: string[] = [];
  lines.push(`${truncate(detail.operator, LINE_WIDTH)}`);
  lines.push(`Route: ${truncate(detail.route, LINE_WIDTH - 7)}`);
  lines.push(separator());

  // Times
  const depTime = detail.estimatedDeparture === 'On time'
    ? detail.scheduledDeparture
    : detail.estimatedDeparture;
  const arrTime = detail.estimatedArrival === 'On time'
    ? detail.scheduledArrival
    : detail.estimatedArrival;

  lines.push(formatTwoColumn(`Dep: ${depTime}`, `Arr: ${arrTime}`));

  // Duration and coaches
  let infoLine = '';
  if (dep) infoLine += `${dep.duration} min journey`;
  if (detail.coachCount) infoLine += ` · ${detail.coachCount} coaches`;
  lines.push(truncate(infoLine, LINE_WIDTH));
  lines.push(separator());

  // Calling points with scroll
  const cps = detail.callingPoints;
  const scrollPos = snapshot.detailScrollPos;
  const visibleCps = cps.slice(scrollPos, scrollPos + VISIBLE_STOPS);

  lines.push('Calling points:');
  for (const cp of visibleCps) {
    const timeStr = cp.estimatedTime === 'On time' ? cp.scheduledTime : cp.estimatedTime;
    let cpLine = formatTwoColumn(`  ${truncate(cp.station, 24)}`, timeStr);
    if (cp.delayMinutes > 0) cpLine += ` (+${cp.delayMinutes}m)`;
    lines.push(truncate(cpLine, LINE_WIDTH));
  }

  if (scrollPos + VISIBLE_STOPS < cps.length) {
    lines.push(`  ▼ ${cps.length - scrollPos - VISIBLE_STOPS} more stops`);
  }
  if (scrollPos > 0) {
    lines.splice(lines.length - visibleCps.length - 1, 0, `  ▲ ${scrollPos} stops above`);
  }

  // Disruption reason
  if (detail.disruptionReason) {
    lines.push(separator());
    lines.push(wrapText(`⚠ ${detail.disruptionReason}`, LINE_WIDTH));
  }

  return lines.join('\n');
}

function renderActionBar(): string {
  return '↑↓ Scroll   ● Confirm   ●● Back';
}

export const trainDetailScreen = {
  containers(snapshot: AppSnapshot) {
    return [
      new TextContainerProperty({
        xPosition: 0,
        yPosition: 0,
        width: DISPLAY_WIDTH,
        height: HEADER_HEIGHT,
        containerID: 1,
        containerName: 'tdHeader',
        isEventCapture: 0,
        content: renderHeader(snapshot),
        paddingLength: 2,
      }),
      new TextContainerProperty({
        xPosition: 0,
        yPosition: BODY_Y,
        width: DISPLAY_WIDTH,
        height: BODY_HEIGHT,
        containerID: 2,
        containerName: 'tdBody',
        isEventCapture: 1,
        content: renderBody(snapshot),
        paddingLength: 2,
      }),
      new TextContainerProperty({
        xPosition: 0,
        yPosition: DISPLAY_HEIGHT - ACTION_BAR_HEIGHT,
        width: DISPLAY_WIDTH,
        height: ACTION_BAR_HEIGHT,
        containerID: 3,
        containerName: 'tdAction',
        isEventCapture: 0,
        content: renderActionBar(),
        paddingLength: 2,
      }),
    ];
  },

  updates(snapshot: AppSnapshot) {
    return [
      { containerID: 1, containerName: 'tdHeader', content: renderHeader(snapshot) },
      { containerID: 2, containerName: 'tdBody', content: renderBody(snapshot) },
    ];
  },

  action(action: AppAction, nav: any, snapshot: AppSnapshot, ctx: any) {
    switch (action.type) {
      case 'SCROLL_DOWN':
        ctx.dispatch?.({ type: 'SCROLL_DETAIL', direction: 'down' });
        return nav;
      case 'SCROLL_UP': {
        if (snapshot.detailScrollPos === 0) {
          ctx.navigate('departure_board');
        } else {
          ctx.dispatch?.({ type: 'SCROLL_DETAIL', direction: 'up' });
        }
        return nav;
      }
      case 'SELECT':
        ctx.dispatch?.({ type: 'START_JOURNEY' });
        ctx.navigate('journey_active');
        return nav;
      case 'BACK':
        ctx.navigate('departure_board');
        return nav;
      default:
        return nav;
    }
  },
};
