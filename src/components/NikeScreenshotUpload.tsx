import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, Camera, Loader2, CheckCircle2, XCircle, Edit3, ArrowRight } from 'lucide-react';
import { parseNikeScreenshot } from '@/lib/api/scraper';
import type { ScreenshotMatch } from '@/lib/api/scraper';
import type { NikeMatch, NikeMarket, Sport } from '@/types/models';
import { normalizeMarket } from '@/services/marketNormalizer';

interface Props {
  onDataReady: (matches: NikeMatch[], markets: NikeMarket[]) => void;
  onCancel: () => void;
}

export function NikeScreenshotUpload({ onDataReady, onCancel }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [parsing, setParsing] = useState(false);
  const [parsedMatches, setParsedMatches] = useState<ScreenshotMatch[] | null>(null);
  const [editableMatches, setEditableMatches] = useState<ScreenshotMatch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
      setParsedMatches(null);
      setError(null);
      setConfirmed(false);
    }
  };

  const handleParse = async () => {
    if (files.length === 0) return;
    setParsing(true);
    setError(null);
    const allMatches: ScreenshotMatch[] = [];

    try {
      for (const file of files) {
        const base64 = await fileToBase64(file);
        const result = await parseNikeScreenshot(base64, file.type);
        if (result.success && result.matches) {
          allMatches.push(...result.matches);
        } else {
          setError(prev => (prev ? prev + '; ' : '') + (result.error || 'Unknown parsing error'));
        }
      }

      setParsedMatches(allMatches);
      setEditableMatches(allMatches);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setParsing(false);
    }
  };

  const handleConfirm = () => {
    const nikeMatches: NikeMatch[] = [];
    const nikeMarkets: NikeMarket[] = [];
    let matchCounter = 0;
    let marketCounter = 0;

    for (const m of editableMatches) {
      matchCounter++;
      const matchId = `nike-ocr-${matchCounter}`;

      nikeMatches.push({
        id: matchId,
        sport: (m.sport || 'unknown') as Sport,
        date: m.date || new Date().toISOString().slice(0, 10),
        time: m.time || '00:00',
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        rawTitle: `${m.homeTeam} - ${m.awayTeam}`,
        source: 'nike',
        sourceSection: 'superkurzy',
      });

      for (const mkt of m.markets) {
        for (const sel of mkt.selections) {
          marketCounter++;
          const norm = normalizeMarket(mkt.marketName, sel.name, (m.sport || 'unknown') as Sport);
          nikeMarkets.push({
            id: `nike-mkt-ocr-${marketCounter}`,
            matchId,
            marketType: norm.marketType,
            rawMarketName: mkt.marketName,
            rawSelectionName: sel.name,
            selection: norm.selection,
            line: norm.line,
            period: norm.period,
            side: norm.side,
            outcomeCount: mkt.selections.length,
            nikeCurrentOdd: sel.odd,
            isTwoWay: mkt.selections.length === 2,
            rawPayload: { source: 'screenshot_ocr', rawMarketName: mkt.marketName, rawSelection: sel.name, odd: sel.odd },
          });
        }
      }
    }

    setConfirmed(true);
    onDataReady(nikeMatches, nikeMarkets);
  };

  const removeMatch = (idx: number) => {
    setEditableMatches(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <Card className="p-4 space-y-4 border-accent/30 bg-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-bold">Nike Screenshot Upload</h3>
          <Badge variant="outline" className="text-[10px]">OCR Fallback</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Nahraj screenshot(y) Nike Superkurzy stránky. AI extrahuje zápasy a kurzy automaticky.
      </p>

      {/* File input */}
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()} className="gap-1.5">
          <Upload className="h-3.5 w-3.5" />
          Vybrať obrázky ({files.length})
        </Button>
        <Button
          size="sm"
          onClick={handleParse}
          disabled={files.length === 0 || parsing}
          className="gap-1.5"
        >
          {parsing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
          Parsovať AI
        </Button>
      </div>

      {/* File previews */}
      {files.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {files.map((f, i) => (
            <div key={i} className="w-20 h-20 rounded border border-border overflow-hidden">
              <img src={URL.createObjectURL(f)} alt={f.name} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 p-2 rounded">
          <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Parsed results for review */}
      {editableMatches.length > 0 && !confirmed && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold flex items-center gap-1.5">
              <Edit3 className="h-3.5 w-3.5" />
              Parsované zápasy ({editableMatches.length}) — skontroluj a potvrď
            </h4>
            <Button size="sm" onClick={handleConfirm} className="gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Potvrdiť a pokračovať
            </Button>
          </div>

          <div className="overflow-x-auto rounded border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-secondary text-muted-foreground">
                  <th className="px-2 py-1.5 text-left">Šport</th>
                  <th className="px-2 py-1.5 text-left">Dátum</th>
                  <th className="px-2 py-1.5 text-left">Čas</th>
                  <th className="px-2 py-1.5 text-left">Domáci</th>
                  <th className="px-2 py-1.5 text-left">Hostia</th>
                  <th className="px-2 py-1.5 text-left">Trhy</th>
                  <th className="px-2 py-1.5"></th>
                </tr>
              </thead>
              <tbody>
                {editableMatches.map((m, i) => (
                  <tr key={i} className="border-b border-border hover:bg-secondary/50">
                    <td className="px-2 py-1.5">
                      <Badge variant="outline" className="text-[10px]">{m.sport}</Badge>
                    </td>
                    <td className="px-2 py-1.5 font-mono">{m.date}</td>
                    <td className="px-2 py-1.5 font-mono">{m.time}</td>
                    <td className="px-2 py-1.5">{m.homeTeam}</td>
                    <td className="px-2 py-1.5">{m.awayTeam}</td>
                    <td className="px-2 py-1.5">
                      {m.markets.map((mkt, j) => (
                        <div key={j} className="text-[10px]">
                          {mkt.marketName}: {mkt.selections.map(s => `${s.name} ${s.odd}`).join(' | ')}
                        </div>
                      ))}
                    </td>
                    <td className="px-2 py-1.5">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => removeMatch(i)}>
                        <XCircle className="h-3 w-3 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {confirmed && (
        <div className="flex items-center gap-2 text-xs text-primary">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Dáta potvrdené — pokračujem vo workflow
        </div>
      )}
    </Card>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data:image/xxx;base64, prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
