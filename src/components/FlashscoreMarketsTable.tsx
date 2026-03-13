import type { FlashscoreMarket } from '@/types/models';
import { Badge } from '@/components/ui/badge';

export function FlashscoreMarketsTable({ markets }: { markets: FlashscoreMarket[] }) {
  if (markets.length === 0) return <div className="p-8 text-center text-muted-foreground">No Flashscore markets parsed yet</div>;

  return (
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
            <th className="px-2 py-2 text-right">Fortuna</th>
            <th className="px-2 py-2 text-right">Tipsport</th>
            <th className="px-2 py-2 text-right">DOXXbet</th>
            <th className="px-2 py-2 text-right">Tipos</th>
          </tr>
        </thead>
        <tbody>
          {markets.map(m => {
            const getOdd = (name: string) => m.bookmakerOdds.find(b => b.bookmakerName === name)?.currentOdd;
            return (
              <tr key={m.id} className="border-b border-border hover:bg-secondary/50">
                <td className="px-2 py-1.5 font-mono text-xs text-muted-foreground">{m.flashscoreMatchId}</td>
                <td className="px-2 py-1.5 text-xs">{m.rawMarketName}</td>
                <td className="px-2 py-1.5"><Badge variant="outline" className="text-[10px]">{m.marketType ?? '?'}</Badge></td>
                <td className="px-2 py-1.5 text-xs">{m.selection}</td>
                <td className="px-2 py-1.5 font-mono text-xs">{m.line ?? '-'}</td>
                <td className="px-2 py-1.5 text-xs">{m.period}</td>
                <td className="px-2 py-1.5 text-right font-mono text-xs">{getOdd('Fortuna')?.toFixed(2) ?? 'N/A'}</td>
                <td className="px-2 py-1.5 text-right font-mono text-xs">{getOdd('Tipsport')?.toFixed(2) ?? 'N/A'}</td>
                <td className="px-2 py-1.5 text-right font-mono text-xs">{getOdd('DOXXbet')?.toFixed(2) ?? 'N/A'}</td>
                <td className="px-2 py-1.5 text-right font-mono text-xs">{getOdd('Tipos')?.toFixed(2) ?? 'N/A'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
