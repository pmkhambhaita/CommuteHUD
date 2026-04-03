import { useJourneyStore } from '../../store/useJourneyStore';

const LINE_COLORS: Record<string, string> = {
  northern: 'bg-black text-white',
  piccadilly: 'bg-blue-800 text-white',
  victoria: 'bg-cyan-500 text-white',
  metropolitan: 'bg-purple-800 text-white',
  'hammersmith-city': 'bg-pink-400 text-white',
  circle: 'bg-yellow-500 text-black',
  central: 'bg-red-600 text-white',
  jubilee: 'bg-gray-400 text-black',
  bakerloo: 'bg-amber-800 text-white',
  district: 'bg-green-600 text-white',
};

export default function TubeInfo() {
  const tubeLines = useJourneyStore((s) => s.tubeLines);
  const lastRefresh = useJourneyStore((s) => s.tubeLastRefresh);

  if (tubeLines.length === 0) {
    return (
      <div className="p-4 text-commute-muted text-center">
        Loading tube arrivals...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tubeLines.map((line) => (
        <div key={line.lineId} className="p-3 bg-commute-surface rounded-lg border border-commute-accent">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${LINE_COLORS[line.lineId] || 'bg-gray-600 text-white'}`}>
              {line.lineName}
            </span>
          </div>
          <div className="space-y-1">
            {line.arrivals.slice(0, 3).map((arr, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-commute-muted">{arr.destination}</span>
                <span className="text-commute-text font-medium">
                  {arr.departureTime}
                  {arr.platform && <span className="text-xs text-commute-muted ml-1">P{arr.platform}</span>}
                </span>
              </div>
            ))}
            {line.arrivals.length === 0 && (
              <span className="text-xs text-commute-muted">No arrivals</span>
            )}
          </div>
        </div>
      ))}
      {lastRefresh && (
        <div className="text-xs text-commute-muted text-center">
          Updated: {new Date(lastRefresh).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
