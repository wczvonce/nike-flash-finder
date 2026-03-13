import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import type { TrendDirection } from '@/types/models';

export function TrendIcon({ direction }: { direction: TrendDirection }) {
  if (direction === 'up') return <ArrowUp className="inline h-3 w-3 trend-up" />;
  if (direction === 'down') return <ArrowDown className="inline h-3 w-3 trend-down" />;
  if (direction === 'unchanged') return <Minus className="inline h-3 w-3 trend-unchanged" />;
  if (direction === 'unknown') return <span className="inline text-xs text-muted-foreground/50">?</span>;
  return null;
}

export function OddCell({ current, opening, trend, nikeOdd }: {
  current: number | null;
  opening: number | null;
  trend: TrendDirection;
  nikeOdd: number;
}) {
  if (current === null) return <span className="text-muted-foreground">N/A</span>;
  const isLower = nikeOdd > current;

  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className={`font-mono text-sm font-semibold ${isLower ? 'text-primary' : 'text-foreground'}`}>
        {current.toFixed(2)}
      </span>
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        {opening !== null && <span>{opening.toFixed(2)}</span>}
        <TrendIcon direction={trend} />
      </span>
    </div>
  );
}
