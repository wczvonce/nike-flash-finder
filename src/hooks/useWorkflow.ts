import { useState, useCallback } from 'react';
import type {
  NikeMatch, NikeMarket, FlashscoreMatch, FlashscoreMarket,
  ComparisonRow, WorkflowStage, StageStatus, SummaryStats
} from '@/types/models';
import { loadNikeSuperkurzy, extractNikeMarkets, filterTwoWayMarkets } from '@/services/nikeParser';
import { findFlashscoreMatches, parseFlashscoreOdds } from '@/services/flashscoreService';
import { runComparison } from '@/services/comparisonEngine';
import { computeSummary, exportToCSV, downloadCSV } from '@/services/summaryService';

export interface WorkflowData {
  nikeMatches: NikeMatch[];
  nikeMarkets: NikeMarket[];
  nikeTwoWayMarkets: NikeMarket[];
  flashscoreMatches: FlashscoreMatch[];
  flashscoreMarkets: FlashscoreMarket[];
  comparisonRows: ComparisonRow[];
  summary: SummaryStats | null;
  stage: WorkflowStage;
  stageProgress: Record<WorkflowStage, StageStatus>;
  runAll: () => Promise<void>;
  runStage: (stage: WorkflowStage) => Promise<void>;
  reset: () => void;
  exportCSV: () => void;
}

const initialProgress: Record<WorkflowStage, StageStatus> = {
  idle: 'complete',
  loading_nike: 'pending',
  extracting_markets: 'pending',
  matching_flashscore: 'pending',
  parsing_odds: 'pending',
  comparing: 'pending',
  complete: 'pending',
};

export function useWorkflow(): WorkflowData {
  const [nikeMatches, setNikeMatches] = useState<NikeMatch[]>([]);
  const [nikeMarkets, setNikeMarkets] = useState<NikeMarket[]>([]);
  const [nikeTwoWayMarkets, setNikeTwoWayMarkets] = useState<NikeMarket[]>([]);
  const [flashscoreMatches, setFlashscoreMatches] = useState<FlashscoreMatch[]>([]);
  const [flashscoreMarkets, setFlashscoreMarkets] = useState<FlashscoreMarket[]>([]);
  const [comparisonRows, setComparisonRows] = useState<ComparisonRow[]>([]);
  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [stage, setStage] = useState<WorkflowStage>('idle');
  const [stageProgress, setStageProgress] = useState(initialProgress);

  const updateProgress = (s: WorkflowStage, status: StageStatus) => {
    setStageProgress(prev => ({ ...prev, [s]: status }));
  };

  const reset = useCallback(() => {
    setNikeMatches([]);
    setNikeMarkets([]);
    setNikeTwoWayMarkets([]);
    setFlashscoreMatches([]);
    setFlashscoreMarkets([]);
    setComparisonRows([]);
    setSummary(null);
    setStage('idle');
    setStageProgress(initialProgress);
  }, []);

  const runAll = useCallback(async () => {
    // Step 1: Load Nike
    setStage('loading_nike');
    updateProgress('loading_nike', 'running');
    const matches = await loadNikeSuperkurzy();
    setNikeMatches(matches);
    updateProgress('loading_nike', 'complete');

    // Step 2: Extract markets
    setStage('extracting_markets');
    updateProgress('extracting_markets', 'running');
    const allMarkets = extractNikeMarkets(matches);
    setNikeMarkets(allMarkets);
    const twoWay = filterTwoWayMarkets(allMarkets);
    setNikeTwoWayMarkets(twoWay);
    updateProgress('extracting_markets', 'complete');

    // Step 3: Match Flashscore
    setStage('matching_flashscore');
    updateProgress('matching_flashscore', 'running');
    const fsMatches = await findFlashscoreMatches(matches);
    setFlashscoreMatches(fsMatches);
    updateProgress('matching_flashscore', 'complete');

    // Step 4: Parse odds
    setStage('parsing_odds');
    updateProgress('parsing_odds', 'running');
    const fsMkts = await parseFlashscoreOdds(fsMatches);
    setFlashscoreMarkets(fsMkts);
    updateProgress('parsing_odds', 'complete');

    // Step 5: Compare
    setStage('comparing');
    updateProgress('comparing', 'running');
    const rows = runComparison(matches, twoWay, fsMatches, fsMkts);
    setComparisonRows(rows);
    const stats = computeSummary(rows);
    stats.totalNikeMatches = matches.length;
    stats.totalNikeMarkets = allMarkets.length;
    stats.totalTwoWayMarkets = twoWay.length;
    stats.totalFlashscoreMatched = fsMatches.length;
    setSummary(stats);
    updateProgress('comparing', 'complete');

    setStage('complete');
    updateProgress('complete', 'complete');
  }, []);

  const runStage = useCallback(async (_stage: WorkflowStage) => {
    // For simplicity, run all stages up to the requested one
    await runAll();
  }, [runAll]);

  const doExportCSV = useCallback(() => {
    if (comparisonRows.length === 0) return;
    const csv = exportToCSV(comparisonRows);
    downloadCSV(csv, `nike-superkurzy-comparison-${new Date().toISOString().slice(0, 10)}.csv`);
  }, [comparisonRows]);

  return {
    nikeMatches, nikeMarkets, nikeTwoWayMarkets,
    flashscoreMatches, flashscoreMarkets, comparisonRows,
    summary, stage, stageProgress,
    runAll, runStage, reset, exportCSV: doExportCSV,
  };
}
