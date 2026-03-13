import type { SummaryStats } from '@/types/models';
import { Badge } from '@/components/ui/badge';

export function SummaryPanel({ stats }: { stats: SummaryStats | null }) {
  if (!stats) return <div className="p-8 text-center text-muted-foreground">Run the analysis to see summary</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Nike Matches" value={stats.totalNikeMatches} />
        <StatCard label="Nike Markets" value={stats.totalNikeMarkets} />
        <StatCard label="2-Way Markets" value={stats.totalTwoWayMarkets} />
        <StatCard label="FS Matched" value={stats.totalFlashscoreMatched} />
        <StatCard label="FS Markets Matched" value={stats.totalFlashscoreMarketsMatched} />
        <StatCard label="Comparison Rows" value={stats.totalComparisonRows} />
        <StatCard label="Nike Higher" value={stats.totalNikeHigher} highlight />
        <StatCard label="Nike Best Overall" value={stats.totalNikeBestOverall} highlight />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <GroupedSummary title="By Sport" data={stats.bySport} />
        <GroupedSummary title="By Market Type" data={stats.byMarketType} />
        <GroupedSummary title="Bookmaker Beaten Most" data={stats.byBookmakerBeaten} />
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded border border-border p-3 ${highlight ? 'row-best' : 'bg-card'}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-mono font-bold ${highlight ? 'text-primary' : 'text-foreground'}`}>{value}</p>
    </div>
  );
}

function GroupedSummary({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  return (
    <div className="rounded border border-border bg-card p-4">
      <h4 className="text-sm font-semibold text-muted-foreground mb-3">{title}</h4>
      {entries.length === 0 ? (
        <p className="text-xs text-muted-foreground">No data</p>
      ) : (
        <div className="space-y-1.5">
          {entries.map(([key, val]) => (
            <div key={key} className="flex items-center justify-between text-sm">
              <span className="text-foreground">{key}</span>
              <Badge variant="outline" className="font-mono">{val}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
