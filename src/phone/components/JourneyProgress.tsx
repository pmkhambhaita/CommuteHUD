import { useJourneyStore } from '../../store/useJourneyStore';
import { minutesUntil, formatCountdown } from '../../utils/time';

export default function JourneyProgress() {
  const journey = useJourneyStore((s) => s.activeJourney);

  if (!journey) return null;

  const dep = journey.departure;
  const now = Date.now();
  const elapsed = now - journey.departureTime;
  const total = journey.arrivalTime - journey.departureTime;
  const fraction = Math.max(0, Math.min(1, elapsed / total));
  const minsToArrival = minutesUntil(journey.arrivalTime);

  const phaseLabels: Record<string, string> = {
    at_station: 'At Station',
    on_train: 'On Train',
    approaching: 'Approaching',
    transfer: 'Transfer',
  };

  const phaseColors: Record<string, string> = {
    at_station: 'bg-commute-warning',
    on_train: 'bg-commute-primary',
    approaching: 'bg-commute-success',
    transfer: 'bg-blue-500',
  };

  return (
    <div className="p-4 bg-commute-surface rounded-lg border border-commute-accent">
      <div className="flex justify-between items-center mb-2">
        <span className={`text-xs font-bold px-2 py-1 rounded ${phaseColors[journey.phase]} text-black`}>
          {phaseLabels[journey.phase] || journey.phase}
        </span>
        <span className="text-sm text-commute-muted">
          {minsToArrival > 0 ? `${formatCountdown(minsToArrival)} to arrival` : 'Arrived'}
        </span>
      </div>

      <div className="flex justify-between text-sm text-commute-text mb-2">
        <span>{dep.scheduledTime} → {dep.estimatedArrival}</span>
        <span>Plat {dep.platform}</span>
      </div>

      <div className="w-full bg-commute-accent rounded-full h-2 mb-1">
        <div
          className="bg-commute-primary h-2 rounded-full transition-all duration-1000"
          style={{ width: `${Math.round(fraction * 100)}%` }}
        />
      </div>
      <div className="text-xs text-commute-muted text-right">{Math.round(fraction * 100)}%</div>
    </div>
  );
}
