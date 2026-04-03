import { TextContainerProperty } from '@evenrealities/even_hub_sdk';
import { DISPLAY_WIDTH, DISPLAY_HEIGHT } from '../../utils/constants';
import { rightAlign, separator, truncate, progressBar, LINE_WIDTH } from '../../utils/glass-text';
import { minutesUntil, formatCountdown } from '../../utils/time';
import type { AppSnapshot, AppAction, ScreenContext } from '../shared';

// ── Phase A: At Station ──
function renderAtStation(s: AppSnapshot): string {
  const j = s.activeJourney!;
  const dep = j.departure;
  const minsLeft = minutesUntil(j.departureTime);
  const totalWait = Math.max(1, Math.round((j.arrivalTime - j.departureTime) / 60000));
  const fraction = Math.max(0, 1 - (minsLeft / Math.max(minsLeft + 5, 15)));

  const lines: string[] = [];
  lines.push(`▶ Board now · Platform ${dep.platform}`);
  lines.push(`  ${dep.scheduledTime} → KGX`);
  lines.push('');
  lines.push(`  Departs in  ${formatCountdown(minsLeft)}`);
  lines.push(`  Journey:    ${totalWait} min`);
  lines.push(`  Arrives:    ${dep.estimatedArrival || '--:--'}`);
  lines.push('');
  lines.push(`  ${progressBar(fraction, 30, 'countdown')}`);
  return lines.join('\n');
}

// ── Phase B: On Train ──
function renderOnTrain(s: AppSnapshot): string {
  const j = s.activeJourney!;
  const dep = j.departure;
  const elapsed = Date.now() - j.departureTime;
  const total = j.arrivalTime - j.departureTime;
  const fraction = Math.min(1, elapsed / total);
  const minsLeft = minutesUntil(j.arrivalTime);
  const pct = Math.round(fraction * 100);

  const lines: string[] = [];
  lines.push(rightAlign(`On train · KGX in ${minsLeft} min`, ''));
  lines.push(`Arrives:  ${dep.estimatedArrival || '--:--'}`);
  lines.push('');

  // Next stops from calling points
  const detail = j.serviceDetail;
  if (detail?.callingPoints) {
    const now = Date.now();
    const upcoming = detail.callingPoints.filter((cp) => {
      const [h, m] = cp.scheduledTime.split(':').map(Number);
      const cpTime = new Date();
      cpTime.setHours(h, m, 0, 0);
      return cpTime.getTime() > now;
    }).slice(0, 2);

    for (const cp of upcoming) {
      const time = cp.estimatedTime || cp.scheduledTime;
      const delay = cp.delayMinutes > 0 ? ` (+${cp.delayMinutes}m)` : '';
      lines.push(`Next stop: ${truncate(cp.station, 18)} ${time}${delay}`);
    }
    if (upcoming.length === 0) {
      lines.push('Next stop: approaching destination');
    }
  }

  lines.push('');
  lines.push(`  ${progressBar(fraction, 30, `${pct}% complete`)}`);
  return lines.join('\n');
}

// ── Phase C: Approaching ──
function renderApproaching(s: AppSnapshot): string {
  const j = s.activeJourney!;
  const minsLeft = minutesUntil(j.arrivalTime);
  const elapsed = Date.now() - j.departureTime;
  const total = j.arrivalTime - j.departureTime;
  const fraction = Math.min(1, elapsed / total);
  const pct = Math.round(fraction * 100);

  const lines: string[] = [];
  lines.push(`★ Arriving KGX in ${minsLeft} min`);
  lines.push('');
  lines.push('Tube connection:');

  for (const line of s.tubeLines.slice(0, 3)) {
    const nextArr = line.arrivals[0];
    if (!nextArr) continue;
    const dest = truncate(nextArr.destination || '', 12);
    const mins = nextArr.departureTime || '--:--';
    lines.push(rightAlign(`  ${truncate(line.lineName, 14)}`, `→ ${dest}  ${mins}`));
  }

  if (s.tubeLines.length === 0) {
    lines.push('  Loading tube data...');
  }

  lines.push('');
  lines.push(`  ${progressBar(fraction, 30, `${pct}% complete`)}`);
  return lines.join('\n');
}

// ── Phase D: Transfer ──
function renderTransfer(s: AppSnapshot): string {
  const lines: string[] = [];
  lines.push("At King's Cross");
  lines.push(separator());

  for (const line of s.tubeLines.slice(0, 4)) {
    const arrivals = line.arrivals.slice(0, 2);
    for (let i = 0; i < arrivals.length; i++) {
      const a = arrivals[i];
      const marker = i === 0 ? '▶' : ' ';
      const platStr = a.platform ? `platform ${a.platform}` : '';
      const timeStr = a.departureTime || '--:--';
      const label = i === 0
        ? `${marker} ${truncate(line.lineName, 14)}  ${platStr}`
        : `  next:          ${platStr}`;
      lines.push(rightAlign(label, timeStr));
    }
    if (arrivals.length === 0) {
      lines.push(`▶ ${truncate(line.lineName, 14)}  --`);
    }
  }

  return lines.join('\n');
}

function renderContent(s: AppSnapshot): string {
  const j = s.activeJourney;
  if (!j) return 'No active journey';

  let content: string;
  switch (j.phase) {
    case 'at_station': content = renderAtStation(s); break;
    case 'on_train': content = renderOnTrain(s); break;
    case 'approaching': content = renderApproaching(s); break;
    case 'transfer': content = renderTransfer(s); break;
    default: content = renderAtStation(s);
  }

  if (j.cancelConfirmPending) {
    content += '\n' + separator();
    content += '\nCancel journey? ▶ Yes  No';
  }

  return content;
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
        paddingLength: 4,
      }),
    ];
  },

  updates(snapshot: AppSnapshot) {
    return [{ containerID: 1, containerName: 'journey', content: renderContent(snapshot) }];
  },

  action(action: AppAction, snapshot: AppSnapshot, ctx: ScreenContext) {
    const j = snapshot.activeJourney;
    if (!j) return;

    switch (action.type) {
      case 'SELECT':
        if (j.cancelConfirmPending) return; // Use BACK to confirm
        // Single press → tube board in phases B, C, D
        if (j.phase !== 'at_station') {
          ctx.navigate('tube_board');
        }
        break;
      case 'BACK':
        if (j.cancelConfirmPending) {
          ctx.dispatch({ type: 'CONFIRM_CANCEL' });
          ctx.navigate('departure_board');
        } else {
          ctx.dispatch({ type: 'TOGGLE_CANCEL_CONFIRM' });
        }
        break;
    }
  },
};
