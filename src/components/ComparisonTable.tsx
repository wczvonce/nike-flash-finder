import { useState, useMemo } from 'react';
import type { ComparisonRow } from '@/types/models';
import { DetailModal } from './DetailModal';
import { ArrowUpDown } from 'lucide-react';
import { TrendBadge } from './TrendBadge';

type SortKey = 'rank' | 'probabilityEdge' | 'percentDiff' | 'absoluteDiff' | 'nikeCurrentOdd' | 'tipsportCurrent' | 'date' | 'sport' | 'marketType';
type SortDir = 'asc' | 'desc';

const PROB_EDGE_PRESETS = [
  { label: 'All', value: 0 },
  { label: '≥ 0.50', value: 0.5 },
  { label: '≥ 1.00', value: 1 },
  { label: '≥ 2.00', value: 2 },
  { label: '≥ 3.00', value: 3 },
];

function getEdgeClass(pe: number): string {
  if (pe >= 2) return 'edge-strong';
  if (pe >= 1) return 'edge-solid';
  return 'edge-small';
}

export function ComparisonTable({ rows }: { rows: ComparisonRow[] }) {
  const [selectedRow, setSelectedRow] = useState<ComparisonRow | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [minProbEdge, setMinProbEdge] = useState(0);
  const [sportFilter, setSportFilter] = useState('');
  const [marketFilter, setMarketFilter] = useState('');

  const sports = useMemo(() => [...new Set(rows.map(r => r.sport))], [rows]);
  const marketTypes = useMemo(() => [...new Set(rows.map(r => r.marketType).filter(Boolean))], [rows]);

  const filtered = useMemo(() => {
    let result = rows.filter(r => r.probabilityEdge >= minProbEdge);
    if (sportFilter) result = result.filter(r => r.sport === sportFilter);
    if (marketFilter) result = result.filter(r => r.marketType === marketFilter);
    return result;
  }, [rows, minProbEdge, sportFilter, marketFilter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'rank': cmp = a.rank - b.rank; break;
        case 'probabilityEdge': cmp = a.probabilityEdge - b.probabilityEdge; break;
        case 'percentDiff': cmp = a.percentDiff - b.percentDiff; break;
        case 'absoluteDiff': cmp = a.absoluteDiff - b.absoluteDiff; break;
        case 'nikeCurrentOdd': cmp = a.nikeCurrentOdd - b.nikeCurrentOdd; break;
        case 'tipsportCurrent': cmp = a.tipsportCurrent - b.tipsportCurrent; break;
        case 'date': cmp = `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`); break;
        case 'sport': cmp = a.sport.localeCompare(b.sport); break;
        case 'marketType': cmp = (a.marketType ?? '').localeCompare(b.marketType ?? ''); break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const top10 = useMemo(() => rows.slice(0, 10), [rows]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'rank' || key === 'date' ? 'asc' : 'desc'); }
  };

  const SortHeader = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <th
      className="px-2 py-2 cursor-pointer select-none hover:text-foreground transition-colors"
      onClick={() => toggleSort(k)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        <ArrowUpDown className={`h-3 w-3 ${sortKey === k ? 'text-primary' : 'text-muted-foreground/50'}`} />
      </span>
    </th>
  );

  return (
    <>
      {/* TOP 10 */}
      {top10.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-bold text-primary mb-2 tracking-wide uppercase">
            Top 10 Nike Advantages vs Tipsport (by Probability Edge)
          </h3>
          <div className="overflow-x-auto rounded border border-primary/30">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-primary/10 text-left text-xs text-muted-foreground">
                  <th className="px-2 py-2">#</th>
                  <th className="px-2 py-2">Match</th>
                  <th className="px-2 py-2">Market</th>
                  <th className="px-2 py-2 text-right">Nike</th>
                  <th className="px-1 py-2 text-center" title="Nike Trend">N↕</th>
                  <th className="px-2 py-2 text-right">Tipsport</th>
                  <th className="px-1 py-2 text-center" title="Tipsport Trend">T↕</th>
                  <th className="px-2 py-2 text-right">Diff</th>
                  <th className="px-2 py-2 text-right">%</th>
                  <th className="px-2 py-2 text-right" title="Probability Edge in percentage points">Prob Edge</th>
                </tr>
              </thead>
              <tbody>
                {top10.map(row => (
                  <tr
                    key={row.id}
                    className={`border-b border-border cursor-pointer hover:bg-secondary/50 transition-colors ${getEdgeClass(row.probabilityEdge)}`}
                    onClick={() => setSelectedRow(row)}
                  >
                    <td className="px-2 py-1.5 font-mono text-xs text-muted-foreground">{row.rank}</td>
                    <td className="px-2 py-1.5 text-xs max-w-[200px] truncate">{row.matchTitle}</td>
                    <td className="px-2 py-1.5 text-xs">{row.marketType} {row.line != null ? row.line : ''} {row.selection}</td>
                    <td className="px-2 py-1.5 text-right font-mono font-bold text-accent">{row.nikeCurrentOdd.toFixed(2)}</td>
                    <td className="px-1 py-1.5 text-center"><TrendBadge direction={row.nikeTrend} /></td>
                    <td className="px-2 py-1.5 text-right font-mono">{row.tipsportCurrent.toFixed(2)}</td>
                    <td className="px-1 py-1.5 text-center"><TrendBadge direction={row.tipsportTrend} /></td>
                    <td className="px-2 py-1.5 text-right font-mono text-primary">+{row.absoluteDiff.toFixed(2)}</td>
                    <td className="px-2 py-1.5 text-right font-mono">+{row.percentDiff.toFixed(2)}%</td>
                    <td className="px-2 py-1.5 text-right font-mono font-bold text-primary">{row.probabilityEdge.toFixed(2)}pp</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FILTERS */}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground" title="Minimum Probability Edge (pp)">Min Prob Edge:</span>
          {PROB_EDGE_PRESETS.map(p => (
            <button
              key={p.value}
              onClick={() => setMinProbEdge(p.value)}
              className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                minProbEdge === p.value
                  ? 'border-primary bg-primary/20 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <select
          value={sportFilter}
          onChange={e => setSportFilter(e.target.value)}
          className="text-xs rounded border border-border bg-card px-2 py-1 text-foreground"
        >
          <option value="">All Sports</option>
          {sports.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={marketFilter}
          onChange={e => setMarketFilter(e.target.value)}
          className="text-xs rounded border border-border bg-card px-2 py-1 text-foreground"
        >
          <option value="">All Markets</option>
          {marketTypes.map(m => <option key={m} value={m!}>{m}</option>)}
        </select>
        <span className="ml-auto text-xs text-muted-foreground font-mono">{sorted.length} rows</span>
      </div>

      {/* FULL TABLE */}
      <div className="overflow-x-auto rounded border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary text-left text-xs text-muted-foreground">
              <SortHeader k="rank">#</SortHeader>
              <SortHeader k="sport">Sport</SortHeader>
              <SortHeader k="date">Date</SortHeader>
              <th className="px-2 py-2">Time</th>
              <th className="px-2 py-2">Match</th>
              <SortHeader k="marketType">Market</SortHeader>
              <th className="px-2 py-2">Sel</th>
              <SortHeader k="nikeCurrentOdd"><span className="text-right w-full">Nike</span></SortHeader>
              <th className="px-1 py-2 text-center" title="Nike Trend">N↕</th>
              <SortHeader k="tipsportCurrent"><span className="text-right w-full">Tipsport</span></SortHeader>
              <th className="px-1 py-2 text-center" title="Tipsport Trend">T↕</th>
              <SortHeader k="absoluteDiff"><span className="text-right w-full">Diff</span></SortHeader>
              <SortHeader k="percentDiff"><span className="text-right w-full">%</span></SortHeader>
              <SortHeader k="probabilityEdge"><span className="text-right w-full" title="Probability Edge (pp)">Prob Edge</span></SortHeader>
            </tr>
          </thead>
          <tbody>
            {sorted.map(row => (
              <tr
                key={row.id}
                className={`border-b border-border cursor-pointer hover:bg-secondary/50 transition-colors ${getEdgeClass(row.probabilityEdge)}`}
                onClick={() => setSelectedRow(row)}
              >
                <td className="px-2 py-1.5 font-mono text-xs text-muted-foreground">{row.rank}</td>
                <td className="px-2 py-1.5 text-xs">{row.sport}</td>
                <td className="px-2 py-1.5 text-xs font-mono">{row.date}</td>
                <td className="px-2 py-1.5 text-xs font-mono">{row.time}</td>
                <td className="px-2 py-1.5 text-xs max-w-[180px] truncate">{row.matchTitle}</td>
                <td className="px-2 py-1.5 text-xs">{row.marketType}</td>
                <td className="px-2 py-1.5 text-xs">{row.selection}</td>
                <td className="px-2 py-1.5 text-right font-mono font-bold text-accent">{row.nikeCurrentOdd.toFixed(2)}</td>
                <td className="px-1 py-1.5 text-center"><TrendBadge direction={row.nikeTrend} /></td>
                <td className="px-2 py-1.5 text-right font-mono">{row.tipsportCurrent.toFixed(2)}</td>
                <td className="px-1 py-1.5 text-center"><TrendBadge direction={row.tipsportTrend} /></td>
                <td className="px-2 py-1.5 text-right font-mono text-primary">+{row.absoluteDiff.toFixed(2)}</td>
                <td className="px-2 py-1.5 text-right font-mono">+{row.percentDiff.toFixed(2)}%</td>
                <td className="px-2 py-1.5 text-right font-mono font-bold text-primary">{row.probabilityEdge.toFixed(2)}pp</td>
              </tr>
            ))}
          </tbody>
        </table>
        {sorted.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">No Nike advantages found against Tipsport</div>
        )}
      </div>
      <DetailModal row={selectedRow} open={!!selectedRow} onClose={() => setSelectedRow(null)} />
    </>
  );
}
