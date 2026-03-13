import type { ComparisonRow, SummaryStats } from '@/types/models';

export function computeSummary(rows: ComparisonRow[]): SummaryStats {
  const pcts = rows.map(r => r.percentDiff);
  const absDiffs = rows.map(r => r.absoluteDiff);

  const bySport: Record<string, number> = {};
  const byMarketType: Record<string, number> = {};

  for (const r of rows) {
    bySport[r.sport] = (bySport[r.sport] || 0) + 1;
    if (r.marketType) byMarketType[r.marketType] = (byMarketType[r.marketType] || 0) + 1;
  }

  const topSport = Object.entries(bySport).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '-';
  const topMarketType = Object.entries(byMarketType).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '-';

  const sorted = [...pcts].sort((a, b) => a - b);
  const median = sorted.length > 0
    ? sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)]
    : 0;

  return {
    totalNikeMatches: 0,
    totalNikeMarkets: 0,
    totalTwoWayMarkets: 0,
    totalFlashscoreMatched: 0,
    totalValidCompared: rows.length,
    totalNikeBetter: rows.length,
    avgAdvantagePercent: pcts.length > 0 ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length * 100) / 100 : 0,
    medianAdvantagePercent: Math.round(median * 100) / 100,
    maxAdvantagePercent: pcts.length > 0 ? Math.max(...pcts) : 0,
    minAdvantagePercent: pcts.length > 0 ? Math.min(...pcts) : 0,
    avgAbsoluteDiff: absDiffs.length > 0 ? Math.round(absDiffs.reduce((a, b) => a + b, 0) / absDiffs.length * 100) / 100 : 0,
    maxAbsoluteDiff: absDiffs.length > 0 ? Math.max(...absDiffs) : 0,
    topSport,
    topMarketType,
    bySport,
    byMarketType,
  };
}

export function exportToCSV(rows: ComparisonRow[]): string {
  const headers = [
    'Rank', 'Sport', 'Date', 'Time', 'Match', 'Market', 'Line', 'Period', 'Selection',
    'Nike Odd', 'Tipsport Odd', 'Abs Diff', '% Diff',
    'Nike Market Name', 'Tipsport Market Name', 'Confidence'
  ];

  const csvRows = [headers.join(',')];

  for (const r of rows) {
    csvRows.push([
      r.rank, r.sport, r.date, r.time, `"${r.matchTitle}"`, r.marketType ?? '', r.line ?? '', r.period, r.selection,
      r.nikeCurrentOdd, r.tipsportCurrent, r.absoluteDiff, r.percentDiff,
      `"${r.nikeMarketName}"`, `"${r.tipsportRawMarketName}"`, r.matchingConfidence
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
