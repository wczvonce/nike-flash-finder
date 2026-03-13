import type { NikeAttemptResult } from '@/lib/api/scraper';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';

interface Props {
  attempts: NikeAttemptResult[];
  selectedSource: string | null;
  fallbackReason: string | null;
}

const statusIcon = (status: string) => {
  if (status === 'success') return <CheckCircle2 className="h-3 w-3 text-primary" />;
  if (status === 'geo_blocked') return <XCircle className="h-3 w-3 text-destructive" />;
  if (status === 'anti_bot') return <AlertTriangle className="h-3 w-3 text-accent" />;
  return <XCircle className="h-3 w-3 text-muted-foreground" />;
};

const statusBadge = (status: string) => {
  const colors: Record<string, string> = {
    success: 'bg-primary/20 text-primary border-primary/30',
    geo_blocked: 'bg-destructive/20 text-destructive border-destructive/30',
    anti_bot: 'bg-accent/20 text-accent border-accent/30',
    empty_response: 'bg-muted text-muted-foreground border-border',
    no_content: 'bg-muted text-muted-foreground border-border',
    error: 'bg-destructive/20 text-destructive border-destructive/30',
  };
  return colors[status] || 'bg-muted text-muted-foreground border-border';
};

export function NikeSourceDebugPanel({ attempts, selectedSource, fallbackReason }: Props) {
  if (attempts.length === 0) return null;

  const hasSuccess = attempts.some(a => a.status === 'success');

  return (
    <div className="rounded border border-border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Info className="h-3.5 w-3.5 text-muted-foreground" />
          <h4 className="text-xs font-bold">Nike Source Debug</h4>
        </div>
        <Badge variant={hasSuccess ? 'default' : 'destructive'} className="text-[10px]">
          {hasSuccess ? `Source: ${selectedSource}` : 'All live sources failed'}
        </Badge>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-muted-foreground text-left">
              <th className="px-2 py-1">Method</th>
              <th className="px-2 py-1">Status</th>
              <th className="px-2 py-1">Reason</th>
            </tr>
          </thead>
          <tbody>
            {attempts.map((a, i) => (
              <tr key={i} className="border-t border-border/50">
                <td className="px-2 py-1 font-mono whitespace-nowrap">{a.method}</td>
                <td className="px-2 py-1">
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border ${statusBadge(a.status)}`}>
                    {statusIcon(a.status)}
                    {a.status}
                  </span>
                </td>
                <td className="px-2 py-1 text-muted-foreground max-w-[300px] truncate">{a.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {fallbackReason && (
        <div className="text-[11px] text-accent flex items-center gap-1.5 pt-1 border-t border-border/50">
          <AlertTriangle className="h-3 w-3" />
          Fallback: {fallbackReason}
        </div>
      )}
    </div>
  );
}
