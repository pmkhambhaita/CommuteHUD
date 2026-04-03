import { TextContainerProperty } from '@evenrealities/even_hub_sdk';
import { DISPLAY_WIDTH, DISPLAY_HEIGHT } from '../../utils/constants';
import { separator, truncate, wrapText, LINE_WIDTH } from '../../utils/glass-text';
import type { AppSnapshot, AppAction } from '../shared';

function renderContent(snapshot: AppSnapshot): string {
  const d = snapshot.disruption;
  if (!d) return '  No disruption data';

  const lines: string[] = [];
  lines.push('');
  lines.push('    ⚠  DISRUPTION ALERT  ⚠');
  lines.push(separator());
  lines.push('');

  // Find the related departure info
  const dep = snapshot.activeJourney?.departure;
  if (dep) {
    lines.push(`Service: ${dep.scheduledTime} ${truncate(dep.operator, 20)}`);
  }

  lines.push('');
  if (d.isCancelled) {
    lines.push('  Status: CANCELLED');
  } else {
    lines.push(`  Delayed: +${d.delayMinutes} minutes`);
  }

  if (d.reason) {
    lines.push('');
    lines.push(separator());
    lines.push(wrapText(d.reason, LINE_WIDTH));
  }

  lines.push('');
  lines.push(separator());
  lines.push('● View alternatives  ●● Dismiss');

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
        containerName: 'disruption',
        isEventCapture: 1,
        content: renderContent(snapshot),
        paddingLength: 4,
      }),
    ];
  },

  updates(snapshot: AppSnapshot) {
    return [
      { containerID: 1, containerName: 'disruption', content: renderContent(snapshot) },
    ];
  },

  action(action: AppAction, nav: any, _snapshot: AppSnapshot, ctx: any) {
    switch (action.type) {
      case 'SELECT':
      case 'VIEW_ALTERNATIVES':
        ctx.dispatch?.({ type: 'DISMISS_DISRUPTION_AND_SHOW_ALTERNATIVES' });
        ctx.navigate('departure_board');
        return nav;
      case 'BACK':
      case 'DISMISS_DISRUPTION':
        ctx.dispatch?.({ type: 'DISMISS_DISRUPTION' });
        ctx.navigate(ctx.previousScreen || 'departure_board');
        return nav;
      default:
        return nav;
    }
  },
};
