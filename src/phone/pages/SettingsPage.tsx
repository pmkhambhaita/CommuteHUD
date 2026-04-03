import { useSettingsStore } from '../../store/useSettingsStore';

const TUBE_LINE_OPTIONS = [
  { id: 'northern', name: 'Northern' },
  { id: 'piccadilly', name: 'Piccadilly' },
  { id: 'victoria', name: 'Victoria' },
  { id: 'metropolitan', name: 'Metropolitan' },
  { id: 'hammersmith-city', name: 'Hammersmith & City' },
  { id: 'circle', name: 'Circle' },
  { id: 'central', name: 'Central' },
  { id: 'jubilee', name: 'Jubilee' },
  { id: 'bakerloo', name: 'Bakerloo' },
  { id: 'district', name: 'District' },
];

export default function SettingsPage() {
  const settings = useSettingsStore();

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-lg font-bold text-commute-text">Settings</h1>

      {/* API info */}
      <div className="p-3 bg-commute-surface rounded-lg border border-commute-accent">
        <p className="text-sm text-commute-success">
          Using Transitous open transit API — no API key required
        </p>
        <p className="text-xs text-commute-muted mt-1">
          Data from GTFS feeds via api.transitous.org
        </p>
      </div>

      {/* Route */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-commute-muted uppercase tracking-wider">Route</h2>
        <div className="space-y-2">
          <label className="block">
            <span className="text-sm text-commute-text">Origin Station</span>
            <input
              type="text"
              value={settings.origin}
              onChange={(e) => settings.updateSettings({ origin: e.target.value })}
              className="mt-1 block w-full bg-commute-surface border border-commute-accent rounded-lg px-3 py-2 text-commute-text text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm text-commute-text">Origin Stop ID</span>
            <input
              type="text"
              value={settings.originStopId}
              onChange={(e) => settings.updateSettings({ originStopId: e.target.value })}
              placeholder="e.g. gb:atoc:SVG"
              className="mt-1 block w-full bg-commute-surface border border-commute-accent rounded-lg px-3 py-2 text-commute-text text-sm font-mono"
            />
          </label>
          <label className="block">
            <span className="text-sm text-commute-text">Destination Station</span>
            <input
              type="text"
              value={settings.destination}
              onChange={(e) => settings.updateSettings({ destination: e.target.value })}
              className="mt-1 block w-full bg-commute-surface border border-commute-accent rounded-lg px-3 py-2 text-commute-text text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm text-commute-text">Destination Stop ID</span>
            <input
              type="text"
              value={settings.destinationStopId}
              onChange={(e) => settings.updateSettings({ destinationStopId: e.target.value })}
              placeholder="e.g. gb:atoc:KGX"
              className="mt-1 block w-full bg-commute-surface border border-commute-accent rounded-lg px-3 py-2 text-commute-text text-sm font-mono"
            />
          </label>
        </div>
      </section>

      {/* Tube station */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-commute-muted uppercase tracking-wider">Tube Station</h2>
        <label className="block">
          <span className="text-sm text-commute-text">Tube Stop ID (for transfer info)</span>
          <input
            type="text"
            value={settings.tubeStationStopId}
            onChange={(e) => settings.updateSettings({ tubeStationStopId: e.target.value })}
            placeholder="e.g. gb:tfl:940GZZLUKSX"
            className="mt-1 block w-full bg-commute-surface border border-commute-accent rounded-lg px-3 py-2 text-commute-text text-sm font-mono"
          />
        </label>
      </section>

      {/* Tube Lines */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-commute-muted uppercase tracking-wider">Tube Lines</h2>
        <div className="space-y-1">
          {TUBE_LINE_OPTIONS.map((line) => (
            <label key={line.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-commute-surface">
              <input
                type="checkbox"
                checked={settings.tubeLines.includes(line.id)}
                onChange={() => settings.toggleTubeLine(line.id)}
                className="w-4 h-4 rounded border-commute-accent accent-commute-primary"
              />
              <span className="text-sm text-commute-text">{line.name}</span>
            </label>
          ))}
        </div>
      </section>

      {/* Disruption threshold */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-commute-muted uppercase tracking-wider">Alerts</h2>
        <label className="block">
          <span className="text-sm text-commute-text">Alert threshold (minutes delay)</span>
          <input
            type="number"
            value={settings.disruptionThreshold}
            onChange={(e) => settings.updateSettings({ disruptionThreshold: parseInt(e.target.value) || 3 })}
            min={1}
            max={30}
            className="mt-1 block w-24 bg-commute-surface border border-commute-accent rounded-lg px-3 py-2 text-commute-text text-sm"
          />
        </label>
      </section>

      <button
        onClick={() => settings.resetSettings()}
        className="w-full py-2 text-sm text-commute-danger border border-commute-danger/30 rounded-lg hover:bg-commute-danger/10"
      >
        Reset to defaults
      </button>
    </div>
  );
}
