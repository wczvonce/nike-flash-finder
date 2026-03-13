import { useWorkflow } from '@/hooks/useWorkflow';
import { Button } from '@/components/ui/button';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { NikeMatchesTable } from '@/components/NikeMatchesTable';
import { NikeMarketsTable } from '@/components/NikeMarketsTable';
import { FlashscoreMatchesTable } from '@/components/FlashscoreMatchesTable';
import { FlashscoreMarketsTable } from '@/components/FlashscoreMarketsTable';
import { ComparisonTable } from '@/components/ComparisonTable';
import { SummaryPanel } from '@/components/SummaryPanel';
import {
  Play, RotateCcw, Download, Loader2, CheckCircle2, Circle, AlertCircle,
  Zap
} from 'lucide-react';
import type { StageStatus, WorkflowStage } from '@/types/models';

const STAGES: { key: WorkflowStage; label: string }[] = [
  { key: 'loading_nike', label: 'Load Nike' },
  { key: 'extracting_markets', label: 'Extract Markets' },
  { key: 'matching_flashscore', label: 'Match Flashscore' },
  { key: 'parsing_odds', label: 'Parse Odds' },
  { key: 'comparing', label: 'Compare' },
];

function StageIcon({ status }: { status: StageStatus }) {
  if (status === 'complete') return <CheckCircle2 className="h-3.5 w-3.5 text-primary" />;
  if (status === 'running') return <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />;
  if (status === 'error') return <AlertCircle className="h-3.5 w-3.5 text-destructive" />;
  return <Circle className="h-3.5 w-3.5 text-muted-foreground" />;
}

export default function Dashboard() {
  const wf = useWorkflow();
  const isRunning = wf.stage !== 'idle' && wf.stage !== 'complete';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-4 py-3">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="h-5 w-5 text-accent" />
            <h1 className="text-lg font-bold tracking-tight">
              Nike Superkurzy Comparator
            </h1>
            <Badge variant="outline" className="text-[10px] font-mono">v1.0 MOCK</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={wf.runAll}
              disabled={isRunning}
              size="sm"
              className="gap-1.5"
            >
              {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              Run All
            </Button>
            <Button onClick={wf.exportCSV} variant="secondary" size="sm" className="gap-1.5" disabled={wf.comparisonRows.length === 0}>
              <Download className="h-3.5 w-3.5" />
              CSV
            </Button>
            <Button onClick={wf.reset} variant="secondary" size="sm" className="gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
          </div>
        </div>
      </header>

      {/* Stage Progress */}
      <div className="border-b border-border bg-card/50 px-4 py-2">
        <div className="mx-auto flex max-w-[1600px] items-center gap-4 overflow-x-auto">
          {STAGES.map((s, i) => (
            <div key={s.key} className="flex items-center gap-1.5 text-xs whitespace-nowrap">
              <StageIcon status={wf.stageProgress[s.key]} />
              <span className={wf.stageProgress[s.key] === 'complete' ? 'text-foreground' : 'text-muted-foreground'}>
                {s.label}
              </span>
              {i < STAGES.length - 1 && <span className="text-muted-foreground ml-2">→</span>}
            </div>
          ))}

          {/* Counts */}
          <div className="ml-auto flex items-center gap-3 text-xs font-mono">
            <span className="text-muted-foreground">Matches: <span className="text-foreground">{wf.nikeMatches.length}</span></span>
            <span className="text-muted-foreground">2-Way: <span className="text-foreground">{wf.nikeTwoWayMarkets.length}</span></span>
            <span className="text-muted-foreground">FS: <span className="text-foreground">{wf.flashscoreMatches.length}</span></span>
            <span className="text-primary font-bold">
              Nike &gt; Tipsport: {wf.comparisonRows.length}
            </span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="mx-auto max-w-[1600px] p-4">
        <Tabs defaultValue="comparison" className="space-y-4">
          <TabsList className="bg-secondary">
            <TabsTrigger value="nike-matches">Nike Matches</TabsTrigger>
            <TabsTrigger value="nike-markets">Nike 2-Way Markets</TabsTrigger>
            <TabsTrigger value="fs-matches">FS Matched Events</TabsTrigger>
            <TabsTrigger value="fs-markets">FS Markets</TabsTrigger>
            <TabsTrigger value="comparison">Nike vs Tipsport</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
          </TabsList>

          <TabsContent value="nike-matches">
            <NikeMatchesTable matches={wf.nikeMatches} />
          </TabsContent>

          <TabsContent value="nike-markets">
            <NikeMarketsTable markets={wf.nikeTwoWayMarkets} title="Filtered 2-Way Markets" />
          </TabsContent>

          <TabsContent value="fs-matches">
            <FlashscoreMatchesTable matches={wf.flashscoreMatches} />
          </TabsContent>

          <TabsContent value="fs-markets">
            <FlashscoreMarketsTable markets={wf.flashscoreMarkets} />
          </TabsContent>

          <TabsContent value="comparison">
            <ComparisonTable rows={wf.comparisonRows} />
          </TabsContent>

          <TabsContent value="summary">
            <SummaryPanel stats={wf.summary} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
