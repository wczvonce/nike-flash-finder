import type { SummaryStats } from '@/types/models';
import { Badge } from '@/components/ui/badge';

export function SummaryPanel({ stats }: { stats: SummaryStats | null }) {
  if (!stats) return <div className="p-8 text-center text-muted-foreground">Run the analysis to see summary</div>;

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-bold text-primary tracking-wide uppercase">Nike vs Tipsport Summary</h3>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Nike Matches" value={stats.totalNikeMatches} />
        <StatCard label="Nike 2-Way Markets" value={stats.totalTwoWayMarkets} />
        <StatCard label="FS Matched" value={stats.totalFlashscoreMatched} />
        <StatCard label="Valid Compared" value={stats.totalValidCompared} />
        <StatCard label="Nike Better (rows)" value={stats.totalNikeBetter} highlight />
        <StatCard label="Avg Advantage %" value={`${stats.avgAdvantagePercent}%`} highlight />
        <StatCard label="Median Advantage %" value={`${stats.medianAdvantagePercent}%`} />
        <StatCard label="Max Advantage %" value={`${stats.maxAdvantagePercent}%`} highlight />
        <StatCard label="Min Advantage %" value={`${stats.minAdvantagePercent}%`} />
        <StatCard label="Avg Abs Diff" value={stats.avgAbsoluteDiff.toFixed(2)} />
        <StatCard label="Max Abs Diff" value={stats.maxAbsoluteDiff.toFixed(2)} highlight />
        <StatCard label="Top Sport" value={stats.topSport} />
        <StatCard label="Top Market Type" value={stats.topMarketType} />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <GroupedSummary title="By Sport" data={stats.bySport} />
        <GroupedSummary title="By Market Type" data={stats.byMarketType} />
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: number | string; highlight?: boolean }) {
  return (
    <div className={`rounded border border-border p-3 ${highlight ? 'edge-strong' : 'bg-card'}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-xl font-mono font-bold ${highlight ? 'text-primary' : 'text-foreground'}`}>{value}</p>
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
