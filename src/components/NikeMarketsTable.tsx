import type { NikeMarket } from '@/types/models';
import { Badge } from '@/components/ui/badge';

export function NikeMarketsTable({ markets, title }: { markets: NikeMarket[]; title: string }) {
  if (markets.length === 0) return <div className="p-8 text-center text-muted-foreground">No markets to display</div>;

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-2">{title}: {markets.length} markets</p>
      <div className="overflow-x-auto rounded border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary text-left text-xs text-muted-foreground">
              <th className="px-2 py-2">Match</th>
              <th className="px-2 py-2">Market</th>
              <th className="px-2 py-2">Type</th>
              <th className="px-2 py-2">Selection</th>
              <th className="px-2 py-2">Line</th>
              <th className="px-2 py-2">Period</th>
              <th className="px-2 py-2 text-right">Odd</th>
              <th className="px-2 py-2">2-Way</th>
              <th className="px-2 py-2"># Outcomes</th>
            </tr>
          </thead>
          <tbody>
            {markets.map(m => (
              <tr key={m.id} className="border-b border-border hover:bg-secondary/50">
                <td className="px-2 py-1.5 font-mono text-xs text-muted-foreground">{m.matchId}</td>
                <td className="px-2 py-1.5 text-xs">{m.rawMarketName}</td>
                <td className="px-2 py-1.5"><Badge variant="outline" className="text-[10px]">{m.marketType ?? 'unknown'}</Badge></td>
                <td className="px-2 py-1.5 text-xs">{m.rawSelectionName}</td>
                <td className="px-2 py-1.5 font-mono text-xs">{m.line ?? '-'}</td>
                <td className="px-2 py-1.5 text-xs">{m.period}</td>
                <td className="px-2 py-1.5 text-right font-mono font-semibold text-accent">{m.nikeCurrentOdd.toFixed(2)}</td>
                <td className="px-2 py-1.5">{m.isTwoWay ? <Badge className="text-[10px]">Yes</Badge> : <Badge variant="destructive" className="text-[10px]">No</Badge>}</td>
                <td className="px-2 py-1.5 font-mono text-xs text-center">{m.outcomeCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
