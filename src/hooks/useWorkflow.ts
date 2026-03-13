import { useState, useCallback } from 'react';
import type {
  NikeMatch, NikeMarket, FlashscoreMatch, FlashscoreMarket,
  ComparisonRow, WorkflowStage, StageStatus, SummaryStats
} from '@/types/models';
import type { NikeAttemptResult } from '@/lib/api/scraper';
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
  errors: string[];
  nikeAttempts: NikeAttemptResult[];
  nikeSourceMethod: string | null;
  nikeFallbackReason: string | null;
  needsScreenshotFallback: boolean;
  runAll: () => Promise<void>;
  runStage: (stage: WorkflowStage) => Promise<void>;
  reset: () => void;
  exportCSV: () => void;
  injectScreenshotData: (matches: NikeMatch[], markets: NikeMarket[]) => void;
  continueAfterNike: () => Promise<void>;
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
  const [errors, setErrors] = useState<string[]>([]);

  // Nike source debug state
  const [nikeAttempts, setNikeAttempts] = useState<NikeAttemptResult[]>([]);
  const [nikeSourceMethod, setNikeSourceMethod] = useState<string | null>(null);
  const [nikeFallbackReason, setNikeFallbackReason] = useState<string | null>(null);
  const [needsScreenshotFallback, setNeedsScreenshotFallback] = useState(false);

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
    setErrors([]);
    setNikeAttempts([]);
    setNikeSourceMethod(null);
    setNikeFallbackReason(null);
    setNeedsScreenshotFallback(false);
  }, []);

  const runFlashscoreAndCompare = useCallback(async (
    matches: NikeMatch[],
    allMarkets: NikeMarket[],
    twoWay: NikeMarket[],
    allErrors: string[]
  ) => {
    // Step 3: Match Flashscore
    setStage('matching_flashscore');
    updateProgress('matching_flashscore', 'running');
    const fsResult = await findFlashscoreMatches(matches);
    const fsMatchList = fsResult.matches;
    if (fsResult.error) allErrors.push(fsResult.error);
    setFlashscoreMatches(fsMatchList);
    updateProgress('matching_flashscore', fsMatchList.length > 0 ? 'complete' : 'error');

    // Step 4: Parse odds
    setStage('parsing_odds');
    updateProgress('parsing_odds', 'running');
    const fsMkts = await parseFlashscoreOdds(fsMatchList);
    setFlashscoreMarkets(fsMkts);
    updateProgress('parsing_odds', 'complete');

    // Step 5: Compare
    setStage('comparing');
    updateProgress('comparing', 'running');
    const rows = runComparison(matches, twoWay, fsMatchList, fsMkts);
    setComparisonRows(rows);
    const stats = computeSummary(rows);
    stats.totalNikeMatches = matches.length;
    stats.totalNikeMarkets = allMarkets.length;
    stats.totalTwoWayMarkets = twoWay.length;
    stats.totalFlashscoreMatched = fsMatchList.length;
    setSummary(stats);
    updateProgress('comparing', 'complete');

    setErrors(allErrors);
    setStage('complete');
    updateProgress('complete', allErrors.length > 0 ? 'error' : 'complete');
  }, []);

  const runAll = useCallback(async () => {
    const allErrors: string[] = [];
    setErrors([]);
    setNeedsScreenshotFallback(false);
    setNikeAttempts([]);
    setNikeSourceMethod(null);
    setNikeFallbackReason(null);

    // Step 1: Load Nike (multi-method)
    setStage('loading_nike');
    updateProgress('loading_nike', 'running');
    const nikeResult = await loadNikeSuperkurzy();
    const matches = nikeResult.matches;

    // Store debug info from attempts
    if (nikeResult.attempts) {
      setNikeAttempts(nikeResult.attempts);
    }
    if (nikeResult.sourceMethod) {
      setNikeSourceMethod(nikeResult.sourceMethod);
    }

    if (matches.length === 0) {
      // All live methods failed — switch to screenshot fallback
      const reason = nikeResult.error || 'All live Nike ingestion methods failed';
      setNikeFallbackReason(reason);
      setNeedsScreenshotFallback(true);
      allErrors.push(reason + ' → Použi screenshot upload.');
      setErrors(allErrors);
      updateProgress('loading_nike', 'error');
      return; // Wait for screenshot data
    }

    if (nikeResult.error) allErrors.push(nikeResult.error);
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

    await runFlashscoreAndCompare(matches, allMarkets, twoWay, allErrors);
  }, [runFlashscoreAndCompare]);

  // Called when screenshot data is ready
  const injectScreenshotData = useCallback((matches: NikeMatch[], markets: NikeMarket[]) => {
    setNikeMatches(matches);
    setNikeMarkets(markets);
    const twoWay = markets.filter(m => m.isTwoWay && m.marketType !== null);
    setNikeTwoWayMarkets(twoWay);
    setNikeSourceMethod('screenshot_ocr');
    updateProgress('loading_nike', 'complete');
    updateProgress('extracting_markets', 'complete');
  }, []);

  // Continue workflow after screenshot data injection
  const continueAfterNike = useCallback(async () => {
    if (nikeMatches.length === 0) return;
    setNeedsScreenshotFallback(false);
    const allErrors: string[] = [];
    await runFlashscoreAndCompare(nikeMatches, nikeMarkets, nikeTwoWayMarkets, allErrors);
  }, [nikeMatches, nikeMarkets, nikeTwoWayMarkets, runFlashscoreAndCompare]);

  const runStage = useCallback(async (_stage: WorkflowStage) => {
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
    summary, stage, stageProgress, errors,
    nikeAttempts, nikeSourceMethod, nikeFallbackReason, needsScreenshotFallback,
    runAll, runStage, reset, exportCSV: doExportCSV,
    injectScreenshotData, continueAfterNike,
  };
}
