import { TextContainerProperty } from '@evenrealities/even_hub_sdk';
import { DISPLAY_WIDTH, DISPLAY_HEIGHT } from '../../utils/constants';
import { formatHeader, separator, truncate, formatTwoColumn, buildProgressBar, LINE_WIDTH } from '../../utils/glass-text';
import { minutesUntil, formatCountdown, formatSecondsAsMinutes } from '../../utils/time';
import type { AppSnapshot, AppAction } from '../shared';

function renderPhaseA(snapshot: AppSnapshot): string {
  const j = snapshot.activeJourney!;
  const dep = j.departure;
  const minsLeft = minutesUntil(j.departureTime);
  const totalWait = Math.max(1, Math.round((j.departureTime - Date.now() + minsLeft * 60000) / 60000));
  const fraction = 1 - minsLeft / Math.max(totalWait, 1);

  const lines: string[] = [];
  lines.push(formatHeader('AT STATION', `Plat ${dep.platform}`));
  lines.push(separator());
  lines.push(`${dep.scheduledTime} to ${truncate(dep.destination, 24)}`);
  lines.push(`${dep.journeyType} · ${dep.duration} min journey`);
  lines.push(`Arriving at ${dep.estimatedArrival}`);
  lines.push('');
  lines.push(`Departing in ${formatCountdown(minsLeft)}`);
  lines.push(buildProgressBar(fraction, 34, `${minsLeft}m`));
  lines.push('');

  if (dep.delayMinutes > 0) {
    lines.push(`⚠ Delayed +${dep.delayMinutes} min`);
  } else {
    lines.push('ON TIME');
  }

  return lines.join('\n');
}

function renderPhaseB(snapshot: AppSnapshot): string {
  const j = snapshot.activeJourney!;
  const dep = j.departure;
  const detail = j.serviceDetail;
  const elapsed = Date.now() - j.departureTime;
  const total = j.arrivalTime - j.departureTime;
  const fraction = Math.min(1, elapsed / total);

  const lines: string[] = [];
  lines.push(formatHeader('ON TRAIN', `${Math.round(fraction * 100)}%`));
  lines.push(separator());
  lines.push(formatTwoColumn(`Dep ${dep.scheduledTime}`, `Arr ${dep.estimatedArrival}`));
  lines.push(`→ ${truncate(dep.destination, LINE_WIDTH - 2)}`);
  lines.push('');

  // Next 2 calling points
  if (detail?.callingPoints) {
    const now = Date.now();
    const upcoming = detail.callingPoints.filter((cp) => {
      const [h, m] = cp.scheduledTime.split(':').map(Number);
      const cpTime = new Date();
      cpTime.setHours(h, m, 0, 0);
      return cpTime.getTime() > now;
    }).slice(0, 2);

    if (upcoming.length > 0) {
      lines.push('Next stops:');
      for (const cp of upcoming) {
        const time = cp.estimatedTime === 'On time' ? cp.scheduledTime : cp.estimatedTime;
        let cpLine = formatTwoColumn(`  ${truncate(cp.station, 22)}`, time);
        if (cp.delayMinutes > 0) cpLine = truncate(cpLine + ` (+${cp.delayMinutes}m)`, LINE_WIDTH);
        lines.push(cpLine);
      }
    }
  }

  lines.push('');
  lines.push(buildProgressBar(fraction, 34, `${Math.round(fraction * 100)}%`));
  lines.push(separator());
  lines.push('● Tube board    ●● Cancel journey');

  return lines.join('\n');
}

function renderPhaseC(snapshot: AppSnapshot): string {
  const j = snapshot.activeJourney!;
  const dep = j.departure;
  const elapsed = Date.now() - j.departureTime;
  const total = j.arrivalTime - j.departureTime;
  const fraction = Math.min(1, elapsed / total);
  const minsToArrival = minutesUntil(j.arrivalTime);

  const lines: string[] = [];
  lines.push(formatHeader('APPROACHING', `${minsToArrival}m`));
  lines.push(separator());
  lines.push(`Arriving ${dep.destination}`);
  lines.push(`Est. ${dep.estimatedArrival}`);
  lines.push(separator());

  // Tube connections
  lines.push('Tube connections:');
  for (const line of snapshot.tubeLines.slice(0, 3)) {
    const nextArr = line.arrivals[0];
    const timeStr = nextArr
      ? formatSecondsAsMinutes(nextArr.timeToStation)
      : '--';
    lines.push(formatTwoColumn(`  ${truncate(line.lineName, 18)}`, timeStr));
  }

  lines.push('');
  lines.push(buildProgressBar(fraction, 34, `${Math.round(fraction * 100)}%`));
  lines.push('● Tube board    ●● Cancel journey');

  return lines.join('\n');
}

function renderPhaseD(snapshot: AppSnapshot): string {
  const lines: string[] = [];
  lines.push(formatHeader("At King's Cross", ''));
  lines.push(separator());

  for (const line of snapshot.tubeLines) {
    lines.push(`${truncate(line.lineName, 12)}:`);
    const arrivals = line.arrivals.slice(0, 3);
    for (let i = 0; i < arrivals.length; i++) {
      const a = arrivals[i];
      const marker = i === 0 ? '●' : '○';
      const timeStr = formatSecondsAsMinutes(a.timeToStation);
      const platStr = a.platformName ? ` (${truncate(a.platformName, 10)})` : '';
      lines.push(`  ${marker} ${timeStr}${platStr}`);
    }
  }

  lines.push(separator());
  lines.push('● Tube board    ●● Cancel journey');

  return lines.join('\n');
}

function renderContent(snapshot: AppSnapshot): string {
  const j = snapshot.activeJourney;
  if (!j) return 'No active journey';

  if (j.cancelConfirmPending) {
    const base = renderForPhase(snapshot);
    return base + '\n' + separator() + '\nCancel journey? ▶ Yes  No';
  }

  return renderForPhase(snapshot);
}

function renderForPhase(snapshot: AppSnapshot): string {
  switch (snapshot.activeJourney!.phase) {
    case 'at_station': return renderPhaseA(snapshot);
    case 'on_train': return renderPhaseB(snapshot);
    case 'approaching': return renderPhaseC(snapshot);
    case 'transfer': return renderPhaseD(snapshot);
    default: return renderPhaseA(snapshot);
  }
}

export const journeyActiveScreen = {
  containers(snapshot: AppSnapshot) {
    return [
      new TextContainerProperty({
        xPosition: 0,
        yPosition: 0,
        width: DISPLAY_WIDTH,
        height: DISPLAY_HEIGHT,
        containerID: 1,
        containerName: 'journey',
        isEventCapture: 1,
        content: renderContent(snapshot),
        paddingLength: 2,
      }),
    ];
  },

  updates(snapshot: AppSnapshot) {
    return [
      { containerID: 1, containerName: 'journey', content: renderContent(snapshot) },
    ];
  },

  action(action: AppAction, nav: any, snapshot: AppSnapshot, ctx: any) {
    const j = snapshot.activeJourney;
    if (!j) return nav;

    switch (action.type) {
      case 'SELECT':
        if (j.cancelConfirmPending) {
          // Second double-press logic handled via BACK for confirm
          return nav;
        }
        // Single press → tube board in phases B, C, D
        if (j.phase !== 'at_station') {
          ctx.navigate('tube_board');
        }
        return nav;

      case 'BACK':
        if (j.cancelConfirmPending) {
          ctx.dispatch?.({ type: 'CONFIRM_CANCEL' });
          ctx.navigate('departure_board');
        } else {
          ctx.dispatch?.({ type: 'TOGGLE_CANCEL_CONFIRM' });
        }
        return nav;

      default:
        return nav;
    }
  },
};
