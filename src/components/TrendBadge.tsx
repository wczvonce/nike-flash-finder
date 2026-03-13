import type { TrendDirection, TrendAlignment } from '@/types/models';

const trendConfig: Record<string, { symbol: string; label: string; className: string }> = {
  up: { symbol: '↑', label: 'Rising', className: 'text-green-500' },
  down: { symbol: '↓', label: 'Falling', className: 'text-red-500' },
  unchanged: { symbol: '→', label: 'Unchanged', className: 'text-muted-foreground' },
  unknown: { symbol: '?', label: 'Unknown', className: 'text-muted-foreground/50' },
};

export function TrendBadge({ direction }: { direction: TrendDirection }) {
  const key = direction ?? 'unknown';
  const cfg = trendConfig[key] ?? trendConfig.unknown;
  return (
    <span className={`font-mono font-bold ${cfg.className}`} title={cfg.label}>
      {cfg.symbol}
    </span>
  );
}

const alignmentConfig: Record<TrendAlignment, { label: string; className: string }> = {
  'very favorable': { label: 'Very Favorable', className: 'text-green-500 font-bold' },
  'favorable': { label: 'Favorable', className: 'text-green-400' },
  'neutral': { label: 'Neutral', className: 'text-muted-foreground' },
  'unfavorable': { label: 'Unfavorable', className: 'text-red-500' },
};

export function TrendAlignmentBadge({ alignment }: { alignment: TrendAlignment }) {
  const cfg = alignmentConfig[alignment];
  return (
    <span className={`text-xs ${cfg.className}`} title={`Trend alignment: ${cfg.label}`}>
      {cfg.label}
    </span>
  );
}
