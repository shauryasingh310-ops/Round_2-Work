
import React, { ReactElement } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet.heat';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search } from 'lucide-react';
import { ALL_STATES } from '@/lib/all-states';
import { STATE_COORDINATES } from '@/lib/state-coordinates';
import { MOCK_DISEASE_DATA } from '@/lib/mock-disease-data';
import { simulationEngine } from '@/lib/simulation-engine';

type StateRisk = { name: string; lat: number; lng: number; risk: number }

function normalizePlaceName(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '')
    .trim()
}

function severityToScore(severity: string): number {
  switch (severity) {
    case 'critical':
      return 0.95;
    case 'high':
      return 0.75;
    case 'medium':
      return 0.55;
    case 'low':
    default:
      return 0.25;
  }
}

function trendToAdjustment(trend: string): number {
  if (trend === 'rising') return 0.06;
  if (trend === 'falling') return -0.04;
  return 0;
}

// Prefer explicit risk values (0..1) where provided.
const RISK_BY_STATE_FROM_MOCK: Record<string, number> = MOCK_DISEASE_DATA.reduce<Record<string, number>>(
  (acc, row) => {
    const r = typeof row.risk === 'number' ? row.risk : 0;
    const prev = acc[row.state] ?? 0;
    acc[row.state] = Math.max(prev, r);
    return acc;
  },
  {}
);

// Derive a logical risk (0..1) from the simulation engine seed dataset.
const SIM_REGION_DATA = simulationEngine.getRegionData();
const maxIncidencePer100k = Math.max(
  0.0001,
  ...SIM_REGION_DATA.map((r) => (r.population > 0 ? (r.cases / r.population) * 100000 : 0))
);

const RISK_BY_STATE_FROM_SIM: Record<string, number> = SIM_REGION_DATA.reduce<Record<string, number>>(
  (acc, region) => {
    const incidencePer100k = region.population > 0 ? (region.cases / region.population) * 100000 : 0;
    const incidenceScore = clamp01(incidencePer100k / maxIncidencePer100k);
    const sevScore = severityToScore(region.severity);
    const capacityScore = clamp01((100 - region.hospital_capacity) / 100);
    const trendAdj = trendToAdjustment(region.trend);

    // Weighted mix: incidence drives risk; severity + capacity + trend refine it.
    const computed = clamp01(0.62 * incidenceScore + 0.25 * sevScore + 0.13 * capacityScore + trendAdj);
    const prev = acc[region.region] ?? 0;
    acc[region.region] = Math.max(prev, computed);
    return acc;
  },
  {}
);

const stateRiskData: StateRisk[] = ALL_STATES.map((name) => {
  const coords = STATE_COORDINATES[name];
  // Default unknown states/UTs to low risk instead of random-high.
  const fallbackRisk = 0.25;
  const risk = clamp01(RISK_BY_STATE_FROM_MOCK[name] ?? RISK_BY_STATE_FROM_SIM[name] ?? fallbackRisk);

  if (!coords) {
    return null;
  }

  return { name, lat: coords.lat, lng: coords.lng, risk };
}).filter(Boolean) as StateRisk[];

function getRiskColor(risk: number): string {
  if (risk > 0.7) return '#e74c3c'; // High
  if (risk > 0.5) return '#f1c40f'; // Medium
  return '#2ecc71'; // Low
}

function getRiskLabel(risk: number): 'High' | 'Medium' | 'Low' {
  if (risk > 0.7) return 'High';
  if (risk > 0.5) return 'Medium';
  return 'Low';
}

function RiskPill({ risk, label }: { risk: number; label?: string }): ReactElement {
  const riskLabel = label ?? getRiskLabel(risk);
  const isMedium = riskLabel === 'Medium';
  return (
    <Badge
      variant="outline"
      className={isMedium ? 'border-transparent text-black/90' : 'border-transparent text-white'}
      style={{
        backgroundColor: getRiskColor(risk),
      }}
    >
      {riskLabel}
    </Badge>
  );
}

type HeatPoint = [number, number, number];

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function riskToHeatIntensity(risk: number): number {
  // Keep heat intensity aligned with the same thresholds used by circle colors.
  // Note: heatmaps will still blend/blur colors where points overlap.
  return clamp01(risk);
}

function HeatmapLayer({ enabled, points }: { enabled: boolean; points: HeatPoint[] }): null {
  const map = useMap();
  const layerRef = useRef<L.Layer | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
      return;
    }

    const normalizedPoints = points.map(([lat, lng, intensity]) => [
      lat,
      lng,
      clamp01(intensity),
    ]) as HeatPoint[];

    const heatLayer = (L as any).heatLayer(normalizedPoints, {
      radius: 30,
      blur: 14,
      maxZoom: 11,
      minOpacity: 0.35,
      // Use a fixed max so the gradient meaning stays consistent across datasets.
      max: 1.0,
      gradient: {
        // Match getRiskColor thresholds:
        // Low: <= 0.5 (green), Medium: (0.5, 0.7] (yellow), High: > 0.7 (red)
        0.0: '#2ecc71',
        0.5: '#2ecc71',
        0.5001: '#f1c40f',
        0.7: '#f1c40f',
        0.7001: '#e74c3c',
        1.0: '#e74c3c',
      },
    });

    heatLayer.addTo(map);
    layerRef.current = heatLayer;

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [enabled, map, points]);

  return null;
}

interface SearchBoxProps {
  states: StateRisk[]
  onSelect: (state: StateRisk) => void
}
function SearchBox({ states, onSelect }: SearchBoxProps): ReactElement {
  const [query, setQuery] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return states.filter((s) => s.name.toLowerCase().includes(q));
  }, [query, states]);

  const selectState = (state: StateRisk) => {
    onSelect(state);
    setQuery('');
    inputRef.current?.blur();
  };

  return (
    <div className="absolute top-6 left-[30%] z-[1001] w-[min(360px,calc(100vw-48px))] -translate-x-1/2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          autoComplete="off"
          placeholder="Search state…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setQuery('');
            inputRef.current?.blur();
            return;
          }

          if (e.key !== 'Enter') return;
          if (!query.trim()) return;

          const exact = states.find(
            (s) => s.name.toLowerCase() === query.trim().toLowerCase()
          );
          if (exact) {
            selectState(exact);
            return;
          }

          if (results.length > 0) {
            selectState(results[0]);
          }
          }}
          className="bg-card/90 backdrop-blur pl-9 text-sm shadow-lg shadow-primary/20 border-primary/30 focus-visible:border-primary/60 focus-visible:ring-primary/40"
        />
      </div>
      {results.length > 0 && (
        <div className="bg-card border border-border border-t-0 rounded-b-md shadow max-h-44 overflow-y-auto">
          {results.map((s) => (
            <div
              key={s.name}
              className="px-3 py-2 cursor-pointer border-b border-border/60 hover:bg-accent/20 text-sm text-foreground"
              onClick={() => {
                selectState(s);
              }}
            >
              {s.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface InfoPanelProps {
  selected: StateRisk | null
  onClear: () => void
  onZoomToSelected: () => void
}

function InfoPanel({ selected, onClear, onZoomToSelected }: InfoPanelProps): ReactElement {
  return (
    <Card className="absolute bottom-2 left-2 z-[1001] w-[min(360px,calc(100vw-48px))] max-h-[calc(100%-96px)] overflow-auto bg-card/90 backdrop-blur py-3 gap-3 shadow-lg">
      <CardHeader className="px-4 pb-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base">{selected ? selected.name : 'Risk details'}</CardTitle>
            <CardDescription>
              {selected
                ? 'Selected location'
                : 'Click a marker/circle or use search to jump'}
            </CardDescription>
          </div>
          {selected ? (
            <RiskPill risk={selected.risk} />
          ) : (
            <Badge variant="outline">No selection</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-4">
        {selected && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-lg border border-border bg-background/40 px-3 py-2">
              <div className="text-xs text-muted-foreground">Risk score</div>
              <div className="text-lg font-semibold text-foreground">{Math.round(selected.risk * 100)}%</div>
            </div>
            <div className="rounded-lg border border-border bg-background/40 px-3 py-2">
              <div className="text-xs text-muted-foreground">Category</div>
              <div className="text-lg font-semibold text-foreground">{getRiskLabel(selected.risk)}</div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-xs text-muted-foreground">Legend:</span>
          <div className="flex items-center gap-1.5 text-xs text-foreground">
            <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: getRiskColor(0.8) }} />
            High
          </div>
          <div className="flex items-center gap-1.5 text-xs text-foreground">
            <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: getRiskColor(0.6) }} />
            Medium
          </div>
          <div className="flex items-center gap-1.5 text-xs text-foreground">
            <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: getRiskColor(0.3) }} />
            Low
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onZoomToSelected}
            disabled={!selected}
          >
            Zoom to
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            disabled={!selected}
          >
            Clear
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}




export default function InteractiveMap({ height = 500 }: { height?: number | string }) {
  const [map, setMap] = useState<L.Map | null>(null);
  const [selected, setSelected] = useState<StateRisk | null>(null);
  const [tileTheme, setTileTheme] = useState<'light' | 'dark'>('dark');
  const [showHeatmap, setShowHeatmap] = useState(true);

  type DiseaseDataApiResponse = {
    updatedAt: string
    states: Array<{
      state: string
      riskScore: number
    }>
  }

  const buildFallbackStateRiskData = (): StateRisk[] =>
    ALL_STATES.map((name) => {
      const coords = STATE_COORDINATES[name];
      const fallbackRisk = 0.25;
      const risk = clamp01(RISK_BY_STATE_FROM_MOCK[name] ?? RISK_BY_STATE_FROM_SIM[name] ?? fallbackRisk);
      if (!coords) return null;
      return { name, lat: coords.lat, lng: coords.lng, risk };
    }).filter(Boolean) as StateRisk[];

  const [states, setStates] = useState<StateRisk[]>(() => buildFallbackStateRiskData());

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/disease-data', { cache: 'no-store' });
        if (!res.ok) throw new Error(`API error ${res.status}`);
        const data = (await res.json()) as DiseaseDataApiResponse;

        const liveRiskByName = new Map<string, number>();
        const liveRiskByNormalized = new Map<string, number>();
        for (const row of data.states ?? []) {
          if (!row?.state) continue;
          const risk = clamp01(row.riskScore);
          liveRiskByName.set(row.state, risk);
          liveRiskByNormalized.set(normalizePlaceName(row.state), risk);
        }

        const merged: StateRisk[] = ALL_STATES
          .map((name) => {
            const coords = STATE_COORDINATES[name];
            if (!coords) return null;

            const normalized = normalizePlaceName(name);
            const liveRisk =
              liveRiskByName.get(name) ??
              liveRiskByNormalized.get(normalized);

            const fallbackRisk = 0.25;
            const fallback = clamp01(RISK_BY_STATE_FROM_MOCK[name] ?? RISK_BY_STATE_FROM_SIM[name] ?? fallbackRisk);

            return {
              name,
              lat: coords.lat,
              lng: coords.lng,
              risk: typeof liveRisk === 'number' ? liveRisk : fallback,
            };
          })
          .filter(Boolean) as StateRisk[];

        if (merged.length > 0) setStates(merged);
      } catch {
        // Keep fallback states
      }
    };

    load();
  }, []);

  // If live state data refreshes, keep the selected state risk in sync.
  useEffect(() => {
    if (!selected) return;
    const updated = states.find((s) => s.name === selected.name);
    if (updated && updated.risk !== selected.risk) setSelected(updated);
  }, [states, selected]);

  const heatPoints = useMemo<HeatPoint[]>(
    () => states.map((s) => [s.lat, s.lng, riskToHeatIntensity(s.risk)] as HeatPoint),
    [states]
  );

  const tileConfig =
    tileTheme === 'dark'
      ? {
          url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        }
      : {
          url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        };

  // Invalidate map size and recenter when map is set (e.g., when modal opens)
  useEffect(() => {
    if (map) {
      setTimeout(() => {
        map.invalidateSize();
        if (selected) {
          map.setView([selected.lat, selected.lng], 7, { animate: true });
        } else {
          map.setView([22.9734, 78.6569], 5);
        }
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  // Pan to selected state
  useEffect(() => {
    if (map && selected) {
      map.setView([selected.lat, selected.lng], 7, { animate: true });
    }
  }, [selected, map]);

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl shadow-lg"
      style={{
        height: typeof height === 'number' ? `${height}px` : height,
      }}
    >
      <div className="absolute top-6 right-6 z-[1001] flex items-center gap-2">
        <Button
          variant={showHeatmap ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowHeatmap((v) => !v)}
          title="Toggle heatmap overlay"
        >
          Heatmap
        </Button>
        <Button
          variant={tileTheme === 'light' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTileTheme('light')}
          title="Light map theme"
        >
          Light
        </Button>
        <Button
          variant={tileTheme === 'dark' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTileTheme('dark')}
          title="Dark map theme"
        >
          Dark
        </Button>
      </div>
      <SearchBox states={states} onSelect={setSelected} />
      <InfoPanel
        selected={selected}
        onClear={() => setSelected(null)}
        onZoomToSelected={() => {
          if (!map || !selected) return;
          map.setView([selected.lat, selected.lng], 7, { animate: true });
        }}
      />
      <MapContainer
        center={[22.9734, 78.6569]}
        zoom={5}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%' }}
        whenCreated={setMap}
        zoomControl={true}
      >
        <TileLayer
          key={tileTheme}
          attribution={tileConfig.attribution}
          url={tileConfig.url}
        />
        <HeatmapLayer enabled={showHeatmap} points={heatPoints} />
        {states.map((state) => (
          <React.Fragment key={state.name}>
            <CircleMarker
              key={state.name + '-circle'}
              center={[state.lat, state.lng]}
              radius={10}
              pathOptions={{
                color: getRiskColor(state.risk),
                fillColor: getRiskColor(state.risk),
                fillOpacity: 0.85,
                weight: 2,
              }}
              eventHandlers={{
                click: () => setSelected(state),
              }}
            >
              <Popup>
                <b>{state.name}</b><br />
                Risk score: <span style={{ color: getRiskColor(state.risk), fontWeight: 'bold' }}>{Math.round(state.risk * 100)}%</span>
                <br />
                Category: <span style={{ color: getRiskColor(state.risk), fontWeight: 'bold' }}>{getRiskLabel(state.risk)}</span>
              </Popup>
            </CircleMarker>
          </React.Fragment>
        ))}
      </MapContainer>
    </div>
  );
}
