import { TextContainerProperty } from '@evenrealities/even_hub_sdk';
import { DISPLAY_WIDTH, DISPLAY_HEIGHT } from '../../utils/constants';
import { separator, wrapText, rightAlign, LINE_WIDTH } from '../../utils/glass-text';
import type { AppSnapshot, AppAction, ScreenContext } from '../shared';

function renderContent(snapshot: AppSnapshot): string {
  const d = snapshot.disruption;
  const dep = snapshot.activeJourney?.departure;
  const lines: string[] = [];

  lines.push('⚠ DISRUPTION DETECTED');
  lines.push(separator());
  lines.push('');

  if (dep && d) {
    if (d.isCancelled) {
      lines.push(`${dep.scheduledTime} CANCELLED`);
    } else {
      lines.push(`${dep.scheduledTime} now: +${d.delayMinutes} min delay`);
    }
  } else if (d) {
    lines.push(`Delay: +${d.delayMinutes} min`);
  }

  if (d?.reason) {
    lines.push(`Reason: ${wrapText(d.reason, LINE_WIDTH - 8)}`);
  }

  lines.push('');
  lines.push(separator());
  lines.push(rightAlign('▶ View alternatives  [●]', ''));
  lines.push(rightAlign('  Dismiss            [●●]', ''));

  return lines.join('\n');
}

export const disruptionAlertScreen = {
  containers(snapshot: AppSnapshot) {
    return [
      new TextContainerProperty({
        xPosition: 0,
        yPosition: 0,
        width: DISPLAY_WIDTH,
        height: DISPLAY_HEIGHT,
        containerID: 1,
        containerName: 'disrupt',
        isEventCapture: 1,
        content: renderContent(snapshot),
        paddingLength: 8,
      }),
    ];
  },

  updates(snapshot: AppSnapshot) {
    return [{ containerID: 1, containerName: 'disrupt', content: renderContent(snapshot) }];
  },

  action(action: AppAction, _snapshot: AppSnapshot, ctx: ScreenContext) {
    switch (action.type) {
      case 'SELECT':
        ctx.dispatch({ type: 'DISMISS_AND_SHOW_ALTERNATIVES' });
        ctx.navigate('departure_board');
        break;
      case 'BACK':
        ctx.dispatch({ type: 'DISMISS_DISRUPTION' });
        ctx.navigate(ctx.previousScreen || 'journey_active');
        break;
    }
  },
};
