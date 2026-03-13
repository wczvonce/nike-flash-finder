import type { FlashscoreMatch } from '@/types/models';
import { Badge } from '@/components/ui/badge';

export function FlashscoreMatchesTable({ matches }: { matches: FlashscoreMatch[] }) {
  if (matches.length === 0) return <div className="p-8 text-center text-muted-foreground">No Flashscore matches found yet</div>;

  return (
    <div className="overflow-x-auto rounded border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-secondary text-left text-xs text-muted-foreground">
            <th className="px-3 py-2">Nike Match</th>
            <th className="px-3 py-2">Sport</th>
            <th className="px-3 py-2">Home</th>
            <th className="px-3 py-2">Away</th>
            <th className="px-3 py-2">Date</th>
            <th className="px-3 py-2">Confidence</th>
            <th className="px-3 py-2">URL</th>
          </tr>
        </thead>
        <tbody>
          {matches.map(m => (
            <tr key={m.id} className="border-b border-border hover:bg-secondary/50">
              <td className="px-3 py-1.5 font-mono text-xs text-muted-foreground">{m.matchedNikeMatchId}</td>
              <td className="px-3 py-1.5"><Badge variant="outline" className="text-xs">{m.sport}</Badge></td>
              <td className="px-3 py-1.5">{m.homeTeam}</td>
              <td className="px-3 py-1.5">{m.awayTeam}</td>
              <td className="px-3 py-1.5 font-mono text-xs">{m.date} {m.time}</td>
              <td className="px-3 py-1.5">
                <Badge variant={m.matchingConfidence >= 80 ? 'default' : 'secondary'} className="font-mono text-xs">
                  {m.matchingConfidence}%
                </Badge>
              </td>
              <td className="px-3 py-1.5 text-xs text-muted-foreground truncate max-w-[200px]">{m.flashscoreUrl}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
