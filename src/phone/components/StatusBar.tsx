import { useJourneyStore } from '../../store/useJourneyStore';

export default function StatusBar() {
  const screen = useJourneyStore((s) => s.screen);
  const isForeground = useJourneyStore((s) => s.isForeground);
  const activeJourney = useJourneyStore((s) => s.activeJourney);

  const screenLabels: Record<string, string> = {
    splash: 'Starting...',
    departure_board: 'Departure Board',
    train_detail: 'Service Detail',
    journey_active: `Journey (${activeJourney?.phase?.replace('_', ' ') || ''})`,
    disruption_alert: 'Disruption Alert',
    tube_board: 'Tube Board',
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-commute-surface border-b border-commute-accent">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isForeground ? 'bg-commute-success' : 'bg-commute-muted'}`} />
        <span className="text-sm text-commute-text font-medium">
          {screenLabels[screen] || screen}
        </span>
      </div>
      <span className="text-xs text-commute-muted">
        {isForeground ? 'Glasses connected' : 'Background'}
      </span>
    </div>
  );
}
