import type { Departure } from '../../types';

interface Props {
  departure: Departure;
  isSelected: boolean;
  onSelect: () => void;
}

export default function DepartureCard({ departure, isSelected, onSelect }: Props) {
  const statusColor = departure.isCancelled
    ? 'text-commute-danger'
    : departure.delayMinutes > 0
      ? 'text-commute-warning'
      : 'text-commute-success';

  const statusLabel = departure.isCancelled
    ? 'CANCELLED'
    : departure.delayMinutes > 0
      ? `+${departure.delayMinutes}m late`
      : 'On time';

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-3 rounded-lg border transition-all ${
        isSelected
          ? 'border-commute-primary bg-commute-primary/10'
          : 'border-commute-accent bg-commute-surface hover:border-commute-primary/50'
      }`}
    >
      <div className="flex justify-between items-start mb-1">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-commute-text">{departure.scheduledTime}</span>
          <span className="text-xs px-2 py-0.5 rounded bg-commute-accent text-commute-muted">
            Plat {departure.platform}
          </span>
        </div>
        <span className={`text-sm font-medium ${statusColor}`}>{statusLabel}</span>
      </div>
      <div className="flex justify-between text-sm text-commute-muted">
        <span>{departure.journeyType} · {departure.duration} min</span>
        <span>arr {departure.estimatedArrival}</span>
      </div>
      <div className="text-xs text-commute-muted mt-1">{departure.operator}</div>
    </button>
  );
}
