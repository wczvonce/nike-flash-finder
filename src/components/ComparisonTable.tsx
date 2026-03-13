import { useState } from 'react';
import type { ComparisonRow } from '@/types/models';
import { OddCell } from './OddCell';
import { DetailModal } from './DetailModal';
import { Badge } from '@/components/ui/badge';

export function ComparisonTable({ rows, showOnlyNikeHigher }: {
  rows: ComparisonRow[];
  showOnlyNikeHigher: boolean;
}) {
  const [selectedRow, setSelectedRow] = useState<ComparisonRow | null>(null);

  const displayed = showOnlyNikeHigher
    ? rows.filter(r => r.nikeHigherThan.length > 0 || r.status !== 'matched')
    : rows;

  return (
    <>
      <div className="overflow-x-auto rounded border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary text-left text-xs text-muted-foreground">
              <th className="px-2 py-2">Sport</th>
              <th className="px-2 py-2">Date</th>
              <th className="px-2 py-2">Match</th>
              <th className="px-2 py-2">Market</th>
              <th className="px-2 py-2">Line</th>
              <th className="px-2 py-2">Selection</th>
              <th className="px-2 py-2 text-right">Nike</th>
              <th className="px-2 py-2 text-right">Fortuna</th>
              <th className="px-2 py-2 text-right">Tipsport</th>
              <th className="px-2 py-2 text-right">DOXXbet</th>
              <th className="px-2 py-2 text-right">Tipos</th>
              <th className="px-2 py-2">Higher Than</th>
              <th className="px-2 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map(row => {
              const rowClass = row.status !== 'matched' ? 'row-unmatched'
                : row.nikeIsBestOverall ? 'row-best'
                : row.nikeHigherThan.length > 0 ? 'row-higher'
                : '';
              return (
                <tr
                  key={row.id}
                  className={`border-b border-border cursor-pointer hover:bg-secondary/50 transition-colors ${rowClass}`}
                  onClick={() => setSelectedRow(row)}
                >
                  <td className="px-2 py-1.5 text-xs">{row.sport}</td>
                  <td className="px-2 py-1.5 text-xs font-mono">{row.date}</td>
                  <td className="px-2 py-1.5 text-xs max-w-[180px] truncate">{row.matchTitle}</td>
                  <td className="px-2 py-1.5 text-xs">{row.marketType ?? '?'}</td>
                  <td className="px-2 py-1.5 text-xs font-mono">{row.line ?? '-'}</td>
                  <td className="px-2 py-1.5 text-xs">{row.selection}</td>
                  <td className="px-2 py-1.5 text-right">
                    <span className="font-mono text-sm font-bold text-accent">{row.nikeCurrentOdd.toFixed(2)}</span>
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <OddCell current={row.fortunaCurrent} opening={row.fortunaOpening} trend={row.fortunaTrend} nikeOdd={row.nikeCurrentOdd} />
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <OddCell current={row.tipsportCurrent} opening={row.tipsportOpening} trend={row.tipsportTrend} nikeOdd={row.nikeCurrentOdd} />
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <OddCell current={row.doxxbetCurrent} opening={row.doxxbetOpening} trend={row.doxxbetTrend} nikeOdd={row.nikeCurrentOdd} />
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <OddCell current={row.tiposCurrent} opening={row.tiposOpening} trend={row.tiposTrend} nikeOdd={row.nikeCurrentOdd} />
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex flex-wrap gap-1">
                      {row.nikeHigherThan.map(b => (
                        <Badge key={b} variant="outline" className="text-[10px] border-primary text-primary">{b}</Badge>
                      ))}
                      {row.nikeIsBestOverall && <Badge className="text-[10px]">BEST</Badge>}
                    </div>
                  </td>
                  <td className="px-2 py-1.5">
                    <Badge variant={row.status === 'matched' ? 'secondary' : 'destructive'} className="text-[10px]">
                      {row.status}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {displayed.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">No data to display</div>
        )}
      </div>
      <DetailModal row={selectedRow} open={!!selectedRow} onClose={() => setSelectedRow(null)} />
    </>
  );
}
