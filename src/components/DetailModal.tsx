import { useState } from 'react';
import type { ComparisonRow } from '@/types/models';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

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
              <p>Status: <Badge variant={row.status === 'matched' ? 'default' : 'destructive'}>{row.status}</Badge></p>
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

          <div>
            <h4 className="font-semibold text-muted-foreground mb-2">Nike Market</h4>
            <div className="rounded bg-secondary p-3 font-mono text-xs">
              <p>Market: {row.nikeMarketName}</p>
              <p>Selection: {row.nikeSelectionName}</p>
              <p>Current Odd: <span className="text-primary font-bold">{row.nikeCurrentOdd}</span></p>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-muted-foreground mb-2">Bookmaker Odds</h4>
            <div className="grid grid-cols-2 gap-2">
              {(['Fortuna', 'Tipsport', 'DOXXbet', 'Tipos'] as const).map(name => {
                const key = name.toLowerCase().replace('doxxbet', 'doxxbet') as string;
                const cur = name === 'Fortuna' ? row.fortunaCurrent : name === 'Tipsport' ? row.tipsportCurrent : name === 'DOXXbet' ? row.doxxbetCurrent : row.tiposCurrent;
                const open = name === 'Fortuna' ? row.fortunaOpening : name === 'Tipsport' ? row.tipsportOpening : name === 'DOXXbet' ? row.doxxbetOpening : row.tiposOpening;
                const trend = name === 'Fortuna' ? row.fortunaTrend : name === 'Tipsport' ? row.tipsportTrend : name === 'DOXXbet' ? row.doxxbetTrend : row.tiposTrend;
                const beaten = row.nikeHigherThan.includes(name);
                return (
                  <div key={name} className={`rounded p-2 ${beaten ? 'row-best' : 'bg-secondary'}`}>
                    <p className="font-semibold">{name}</p>
                    <p className="font-mono">Current: {cur?.toFixed(2) ?? 'N/A'}</p>
                    <p className="font-mono text-xs text-muted-foreground">Opening: {open?.toFixed(2) ?? 'N/A'} | Trend: {trend ?? 'N/A'}</p>
                    {beaten && <Badge className="mt-1 text-xs">Nike Higher</Badge>}
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-muted-foreground mb-2">Verdict</h4>
            <p>Nike higher than: <span className="text-primary font-semibold">{row.nikeHigherThan.join(', ') || 'None'}</span></p>
            <p>Nike best overall: <span className={row.nikeIsBestOverall ? 'text-primary font-bold' : 'text-muted-foreground'}>{row.nikeIsBestOverall ? 'YES' : 'No'}</span></p>
            {row.notes && <p className="text-muted-foreground mt-1">Notes: {row.notes}</p>}
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
