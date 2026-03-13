import type { ComparisonRow, SummaryStats } from '@/types/models';

export function computeSummary(rows: ComparisonRow[]): SummaryStats {
  const matched = rows.filter(r => r.status === 'matched');
  const nikeHigher = matched.filter(r => r.nikeHigherThan.length > 0);
  const nikeBest = matched.filter(r => r.nikeIsBestOverall);

  const bySport: Record<string, number> = {};
  const byMarketType: Record<string, number> = {};
  const byBookmakerBeaten: Record<string, number> = {};

  for (const r of nikeHigher) {
    bySport[r.sport] = (bySport[r.sport] || 0) + 1;
    if (r.marketType) byMarketType[r.marketType] = (byMarketType[r.marketType] || 0) + 1;
    for (const b of r.nikeHigherThan) {
      byBookmakerBeaten[b] = (byBookmakerBeaten[b] || 0) + 1;
    }
  }

  return {
    totalNikeMatches: 0, // set externally
    totalNikeMarkets: 0,
    totalTwoWayMarkets: 0,
    totalFlashscoreMatched: 0,
    totalFlashscoreMarketsMatched: matched.length,
    totalComparisonRows: rows.length,
    totalNikeHigher: nikeHigher.length,
    totalNikeBestOverall: nikeBest.length,
    bySport,
    byMarketType,
    byBookmakerBeaten,
  };
}

export function exportToCSV(rows: ComparisonRow[]): string {
  const headers = [
    'Sport', 'Date', 'Time', 'Match', 'Market', 'Line', 'Period', 'Selection',
    'Nike', 'Fortuna Cur', 'Fortuna Open', 'Fortuna Trend',
    'Tipsport Cur', 'Tipsport Open', 'Tipsport Trend',
    'DOXXbet Cur', 'DOXXbet Open', 'DOXXbet Trend',
    'Tipos Cur', 'Tipos Open', 'Tipos Trend',
    'Nike Higher Than', 'Nike Best Overall', 'Status', 'Confidence', 'Notes'
  ];

  const csvRows = [headers.join(',')];

  for (const r of rows) {
    csvRows.push([
      r.sport, r.date, r.time, `"${r.matchTitle}"`, r.marketType ?? '', r.line ?? '', r.period, r.selection,
      r.nikeCurrentOdd, r.fortunaCurrent ?? '', r.fortunaOpening ?? '', r.fortunaTrend ?? '',
      r.tipsportCurrent ?? '', r.tipsportOpening ?? '', r.tipsportTrend ?? '',
      r.doxxbetCurrent ?? '', r.doxxbetOpening ?? '', r.doxxbetTrend ?? '',
      r.tiposCurrent ?? '', r.tiposOpening ?? '', r.tiposTrend ?? '',
      `"${r.nikeHigherThan.join(', ')}"`, r.nikeIsBestOverall, r.status, r.matchingConfidence, `"${r.notes}"`
    ].join(','));
  }

  return csvRows.join('\n');
}

export function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
