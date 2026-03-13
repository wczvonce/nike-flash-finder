import type { ComparisonRow } from '@/types/models';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { TrendIcon } from './OddCell';

export function DetailModal({ row, open, onClose }: {
  row: ComparisonRow | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!row) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-mono text-primary">{row.matchTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-muted-foreground mb-1">Match Info</h4>
              <p>Sport: <span className="text-foreground">{row.sport}</span></p>
              <p>Date: <span className="text-foreground">{row.date} {row.time}</span></p>
              <p>Rank: <span className="text-primary font-bold">#{row.rank}</span></p>
              <p>Confidence: <span className="text-foreground">{row.matchingConfidence}%</span></p>
            </div>
            <div>
              <h4 className="font-semibold text-muted-foreground mb-1">Market Info</h4>
              <p>Type: <span className="text-foreground">{row.marketType}</span></p>
              <p>Line: <span className="text-foreground">{row.line ?? 'N/A'}</span></p>
              <p>Period: <span className="text-foreground">{row.period}</span></p>
              <p>Selection: <span className="text-foreground">{row.selection}</span></p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded bg-secondary p-3">
              <h4 className="font-semibold text-accent mb-1">Nike</h4>
              <p className="font-mono text-xs">Market: {row.nikeMarketName}</p>
              <p className="font-mono text-xs">Selection: {row.nikeSelectionName}</p>
              <p className="font-mono text-lg font-bold text-accent">{row.nikeCurrentOdd.toFixed(2)}</p>
            </div>
            <div className="rounded bg-secondary p-3">
              <h4 className="font-semibold text-foreground mb-1">Tipsport</h4>
              <p className="font-mono text-xs">Market: {row.tipsportRawMarketName}</p>
              <p className="font-mono text-lg font-bold">{row.tipsportCurrent.toFixed(2)}</p>
              <p className="font-mono text-xs text-muted-foreground flex items-center gap-1">
                Opening: {row.tipsportOpening?.toFixed(2) ?? 'N/A'}
                <TrendIcon direction={row.tipsportTrend} />
              </p>
            </div>
          </div>

          <div className="rounded border border-primary/30 bg-primary/5 p-3">
            <h4 className="font-semibold text-primary mb-1">Nike Advantage</h4>
            <div className="grid grid-cols-2 gap-4 font-mono">
              <p>Absolute: <span className="text-primary font-bold">+{row.absoluteDiff.toFixed(2)}</span></p>
              <p>Percentage: <span className="text-primary font-bold">+{row.percentDiff.toFixed(2)}%</span></p>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-muted-foreground mb-2">Raw Payloads</h4>
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground">Nike Raw</summary>
              <pre className="mt-1 rounded bg-secondary p-2 overflow-auto">{JSON.stringify(row.nikeRawPayload, null, 2)}</pre>
            </details>
            <details className="text-xs mt-2">
              <summary className="cursor-pointer text-muted-foreground">Flashscore Raw</summary>
              <pre className="mt-1 rounded bg-secondary p-2 overflow-auto">{JSON.stringify(row.flashscoreRawPayload, null, 2)}</pre>
            </details>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
