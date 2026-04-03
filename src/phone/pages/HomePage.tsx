import { useJourneyStore } from '../../store/useJourneyStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import DepartureCard from '../components/DepartureCard';
import JourneyProgress from '../components/JourneyProgress';
import TubeInfo from '../components/TubeInfo';

export default function HomePage() {
  const departures = useJourneyStore((s) => s.departures);
  const highlightedIndex = useJourneyStore((s) => s.highlightedIndex);
  const activeJourney = useJourneyStore((s) => s.activeJourney);
  const lastRefresh = useJourneyStore((s) => s.lastRefresh);
  const isLoading = useJourneyStore((s) => s.isLoading);
  const error = useJourneyStore((s) => s.error);
  const selectDeparture = useJourneyStore((s) => s.selectDeparture);
  const setHighlightedIndex = useJourneyStore((s) => s.setHighlightedIndex);
  const origin = useSettingsStore((s) => s.origin);
  const destination = useSettingsStore((s) => s.destination);

  return (
    <div className="p-4 space-y-4">
      <div className="text-center">
        <h1 className="text-lg font-bold text-commute-text">{origin} → {destination}</h1>
        {lastRefresh && (
          <p className="text-xs text-commute-muted">
            Updated {new Date(lastRefresh).toLocaleTimeString()}
          </p>
        )}
        {error && (
          <p className="text-xs text-commute-danger mt-1">{error}</p>
        )}
        <p className="text-xs text-commute-success mt-1">
          Powered by Transitous — no API key needed
        </p>
      </div>

      {activeJourney && <JourneyProgress />}

      {activeJourney && (activeJourney.phase === 'approaching' || activeJourney.phase === 'transfer') && (
        <div>
          <h2 className="text-sm font-bold text-commute-text mb-2">Tube Connections</h2>
          <TubeInfo />
        </div>
      )}

      <div>
        <h2 className="text-sm font-bold text-commute-text mb-2">Departures</h2>
        {isLoading ? (
          <div className="text-center py-8 text-commute-muted animate-pulse">
            Loading departures...
          </div>
        ) : departures.length === 0 ? (
          <div className="text-center py-8 text-commute-muted">
            No departures found
          </div>
        ) : (
          <div className="space-y-2">
            {departures.slice(0, 6).map((dep, i) => (
              <DepartureCard
                key={dep.tripId || i}
                departure={dep}
                isSelected={i === highlightedIndex}
                onSelect={() => {
                  setHighlightedIndex(i);
                  selectDeparture(dep);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
