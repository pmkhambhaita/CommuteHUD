import { TextContainerProperty } from '@evenrealities/even_hub_sdk';
import { DISPLAY_WIDTH, DISPLAY_HEIGHT, MAX_VISIBLE_STOPS } from '../../utils/constants';
import { rightAlign, separator, truncate, wrapText, LINE_WIDTH } from '../../utils/glass-text';
import type { AppSnapshot, AppAction, ScreenContext } from '../shared';

function renderContent(snapshot: AppSnapshot): string {
  const dep = snapshot.selectedDeparture;
  const detail = snapshot.serviceDetail;
  const lines: string[] = [];

  if (!dep) {
    lines.push('No service selected');
    return lines.join('\n');
  }

  // Header
  const typeStr = dep.routeName || 'Service';
  lines.push(`${dep.scheduledTime} ${typeStr} · Platform ${dep.platform}`);
  lines.push(`${truncate(dep.operator, LINE_WIDTH)}`);
  lines.push(separator());

  if (!detail) {
    lines.push('');
    lines.push('  Loading service details...');
    lines.push('');
    lines.push(separator());
    lines.push(rightAlign('● Set as journey', '↑ Back'));
    return lines.join('\n');
  }

  // Arrival info
  const arrTime = detail.estimatedArrival || detail.scheduledArrival;
  const delayStr = detail.delayMinutes > 0
    ? ` (+${detail.delayMinutes}m)`
    : ' (on time)';
  lines.push(`Arrives KGX:  ${arrTime}${delayStr}`);
  lines.push('');

  // Disruption
  if (detail.disruptionReason) {
    lines.push(`⚠ ${wrapText(detail.disruptionReason, LINE_WIDTH - 2)}`);
  } else {
    lines.push('⚠ Disruption: None');
  }

  // Calling points (scrollable)
  if (detail.callingPoints.length > 0) {
    lines.push(separator());
    const scroll = snapshot.detailScrollPos;
    const visible = detail.callingPoints.slice(scroll, scroll + MAX_VISIBLE_STOPS);
    for (const cp of visible) {
      const time = cp.estimatedTime || cp.scheduledTime;
      const delayInfo = cp.delayMinutes > 0 ? ` (+${cp.delayMinutes}m)` : '';
      lines.push(rightAlign(`  ${truncate(cp.station, 22)}`, `${time}${delayInfo}`));
    }
    if (scroll + MAX_VISIBLE_STOPS < detail.callingPoints.length) {
      lines.push(`  ▼ ${detail.callingPoints.length - scroll - MAX_VISIBLE_STOPS} more`);
    }
  }

  lines.push(separator());
  lines.push(rightAlign('▶ Set as journey → [●]', '← Back [↑]'));

  return lines.join('\n');
}

export const trainDetailScreen = {
  containers(snapshot: AppSnapshot) {
    return [
      new TextContainerProperty({
        xPosition: 0,
        yPosition: 0,
        width: DISPLAY_WIDTH,
        height: DISPLAY_HEIGHT,
        containerID: 1,
        containerName: 'trainDet',
        isEventCapture: 1,
        content: renderContent(snapshot),
        paddingLength: 4,
      }),
    ];
  },

  updates(snapshot: AppSnapshot) {
    return [{ containerID: 1, containerName: 'trainDet', content: renderContent(snapshot) }];
  },

  action(action: AppAction, snapshot: AppSnapshot, ctx: ScreenContext) {
    switch (action.type) {
      case 'SCROLL_DOWN':
        ctx.dispatch({ type: 'SCROLL_DETAIL', direction: 'down' });
        break;
      case 'SCROLL_UP': {
        if (snapshot.detailScrollPos === 0) {
          ctx.navigate('departure_board');
        } else {
          ctx.dispatch({ type: 'SCROLL_DETAIL', direction: 'up' });
        }
        break;
      }
      case 'SELECT':
        ctx.dispatch({ type: 'START_JOURNEY' });
        ctx.navigate('journey_active');
        break;
      case 'BACK':
        ctx.navigate('departure_board');
        break;
    }
  },
};
