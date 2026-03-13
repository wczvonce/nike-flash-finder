import type { ComparisonRow, SummaryStats } from '@/types/models';

export function computeSummary(rows: ComparisonRow[]): SummaryStats {
  const pcts = rows.map(r => r.percentDiff);
  const absDiffs = rows.map(r => r.absoluteDiff);
  const probEdges = rows.map(r => r.probabilityEdge);

  const bySport: Record<string, number> = {};
  const byMarketType: Record<string, number> = {};

  for (const r of rows) {
    bySport[r.sport] = (bySport[r.sport] || 0) + 1;
    if (r.marketType) byMarketType[r.marketType] = (byMarketType[r.marketType] || 0) + 1;
  }

  const topSport = Object.entries(bySport).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '-';
  const topMarketType = Object.entries(byMarketType).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '-';

  const medianOf = (arr: number[]) => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    return sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];
  };

  const avg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 100) / 100 : 0;

  return {
    totalNikeMatches: 0,
    totalNikeMarkets: 0,
    totalTwoWayMarkets: 0,
    totalFlashscoreMatched: 0,
    totalValidCompared: rows.length,
    totalNikeBetter: rows.length,
    avgAdvantagePercent: avg(pcts),
    medianAdvantagePercent: Math.round(medianOf(pcts) * 100) / 100,
    maxAdvantagePercent: pcts.length > 0 ? Math.max(...pcts) : 0,
    minAdvantagePercent: pcts.length > 0 ? Math.min(...pcts) : 0,
    avgAbsoluteDiff: avg(absDiffs),
    maxAbsoluteDiff: absDiffs.length > 0 ? Math.max(...absDiffs) : 0,
    avgProbabilityEdge: avg(probEdges),
    medianProbabilityEdge: Math.round(medianOf(probEdges) * 100) / 100,
    maxProbabilityEdge: probEdges.length > 0 ? Math.max(...probEdges) : 0,
    minProbabilityEdge: probEdges.length > 0 ? Math.min(...probEdges) : 0,
    topSport,
    topMarketType,
    bySport,
    byMarketType,
    nikeUpCount: rows.filter(r => r.nikeTrend === 'up').length,
    nikeDownCount: rows.filter(r => r.nikeTrend === 'down').length,
    tipsportUpCount: rows.filter(r => r.tipsportTrend === 'up').length,
    tipsportDownCount: rows.filter(r => r.tipsportTrend === 'down').length,
    favorableTrendCount: rows.filter(r => r.trendAlignment === 'very favorable' || r.trendAlignment === 'favorable').length,
  };
}

export function exportToCSV(rows: ComparisonRow[]): string {
  const headers = [
    'Rank', 'Sport', 'Date', 'Time', 'Match', 'Market', 'Line', 'Period', 'Selection',
    'Nike Odd', 'Tipsport Odd', 'Abs Diff', '% Diff', 'Probability Edge (pp)',
    'Nike Market Name', 'Tipsport Market Name', 'Confidence'
  ];

  const csvRows = [headers.join(',')];

  for (const r of rows) {
    csvRows.push([
      r.rank, r.sport, r.date, r.time, `"${r.matchTitle}"`, r.marketType ?? '', r.line ?? '', r.period, r.selection,
      r.nikeCurrentOdd, r.tipsportCurrent, r.absoluteDiff, r.percentDiff, r.probabilityEdge,
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
