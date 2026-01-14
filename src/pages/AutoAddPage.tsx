import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../state/settings';
import { useBackKeybind } from '../hooks/useBackKeybind';
import { useKeybinds, formatActionKeys } from '../context/KeybindsProvider';
import CardCreationSettingsSection from '../components/CardCreationSettingsSection';
import { replaceCards } from '../data/cardStore';
import ToggleSwitch from '../components/ToggleSwitch';

type Progress = {
  phase?: string;
  index?: number;
  total?: number;
  url?: string;
  fen?: string;
  pgn?: string;
  message?: string;
  posIdx?: number;
  posTotal?: number;
  creating?: boolean;
  seq?: number;
  deviated?: boolean;
  expected?: string;
  got?: string;
  forced?: boolean;
};

const loadTimeframe = () => {
  try {
    const raw = localStorage.getItem('autoAdd.timeframe');
    if (!raw) return { from: '', to: '' };
    const parsed = JSON.parse(raw) as { from?: string; to?: string };
    return { from: parsed?.from || '', to: parsed?.to || '' };
  } catch {
    return { from: '', to: '' };
  }
};

const saveTimeframe = (from: string, to: string) => {
  try { localStorage.setItem('autoAdd.timeframe', JSON.stringify({ from, to })); } catch {}
};

export default function AutoAddPage() {
  const navigate = useNavigate();
  const { settings, update } = useSettings();
  const { binds } = useKeybinds();
  const backKeys = formatActionKeys(binds, 'app.back');
  useBackKeybind(() => navigate(-1), true);

  const tf = useMemo(loadTimeframe, []);
  const [fromDate, setFromDate] = useState<string>(tf.from);
  const [toDate, setToDate] = useState<string>(tf.to);
  useEffect(() => { saveTimeframe(fromDate, toDate); }, [fromDate, toDate]);

  const [chessUser, setChessUser] = useState(settings.chessComUser || '');
  const [lichessUser, setLichessUser] = useState(settings.lichessUser || '');
  const [chessEnabled, setChessEnabled] = useState<boolean>(!!settings.chessComEnabled);
  const [lichessEnabled, setLichessEnabled] = useState<boolean>(!!settings.lichessEnabled);
  useEffect(() => setChessUser(settings.chessComUser || ''), [settings.chessComUser]);
  useEffect(() => setLichessUser(settings.lichessUser || ''), [settings.lichessUser]);
  useEffect(() => setChessEnabled(!!settings.chessComEnabled), [settings.chessComEnabled]);
  useEffect(() => setLichessEnabled(!!settings.lichessEnabled), [settings.lichessEnabled]);

  const [status, setStatus] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const cleanupRef = useRef<{ offProg?: () => void; offDone?: () => void }>({});
  const lastProgressAt = useRef<number>(0);

  const saveCardgenConfig = async () => {
    try {
      await window.cardgen?.saveConfig?.({
        otherAnswersAcceptance: Number(settings.otherAnswersAcceptance ?? 0),
        maxOtherAnswerCount: Number(settings.maxOtherAnswerCount ?? 0),
        depth: Number(settings.stockfishDepth ?? 25),
        threads: 1,
        hash: 1024,
      });
    } catch {}
  };

  useEffect(() => () => {
    cleanupRef.current.offProg?.();
    cleanupRef.current.offDone?.();
  }, []);

  const formatStatusFromProgress = useCallback((p: Progress | null) => {
    if (!p) return null;
    if (p.message) return p.message;
    if (p.phase === 'start') {
      const total = Math.max(0, Math.floor(p.total ?? 0));
      return total ? `Scanning ${total} game${total === 1 ? '' : 's'}...` : 'No new games to scan.';
    }
    if (p.phase === 'game' || p.phase === 'game:done') {
      const total = Math.max(1, Math.floor(p.total ?? 1));
      const idx = Math.min(total, Math.max(1, Math.floor(p.index ?? 1)));
      const prefix = p.phase === 'game:done' ? 'Finished' : 'Scanning';
      return `${prefix} game ${idx}/${total}`;
    }
    if (p.phase === 'creating' || p.phase === 'position') {
      const totalGames = Math.max(1, Math.floor(p.total ?? 1));
      const gameIdx = Math.min(totalGames, Math.max(1, Math.floor(p.index ?? 1)));
      const prefix = p.phase === 'creating' ? 'Creating card' : 'Evaluating move';
      return `${prefix} (game ${gameIdx}/${totalGames})`;
    }
    if (p.phase === 'done') return p.message || 'Scan complete.';
    return p.phase || null;
  }, []);

  const finishScan = useCallback((message?: string) => {
    setBusy(false);
    setStatus(message || 'Scan complete.');
    try { cleanupRef.current.offProg?.(); } catch {}
    try { cleanupRef.current.offDone?.(); } catch {}
  }, []);

  const startScan = () => {
    setErr(null);
    setStatus(null);
    setProgress(null);

    const enabledCount = Number(chessEnabled) + Number(lichessEnabled);
    if (!enabledCount) {
      setErr('Enable Chess.com or Lichess to scan.');
      return;
    }
    if (enabledCount > 1) {
      setErr('Choose one source to scan at a time.');
      return;
    }

    const target = chessEnabled ? 'chess' : 'lichess';
    const username = (target === 'chess' ? chessUser : lichessUser).trim();
    if (!username) {
      setErr(`Enter a ${target === 'chess' ? 'Chess.com' : 'Lichess'} username or disable that source.`);
      return;
    }

    if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) {
      setErr('Timeframe end must be after start.');
      return;
    }

    update({
      chessComUser: chessUser,
      lichessUser: lichessUser,
      chessComEnabled: chessEnabled,
      lichessEnabled: lichessEnabled,
    });

    cleanupRef.current.offProg?.();
    cleanupRef.current.offDone?.();
    cleanupRef.current.offProg = window.autogen?.onProgress?.((p: Progress) => {
      lastProgressAt.current = Date.now();
      const msg = formatStatusFromProgress(p || null);
      if (msg) setStatus(msg);
      setProgress(p ? { ...p } : null);
    }) || undefined;
    cleanupRef.current.offDone = window.autogen?.onDone?.(async (res: { ok?: boolean; message?: string; scanned?: number; created?: number; cancelled?: boolean }) => {
      finishScan(res?.message || (res?.ok ? 'Scan complete.' : 'Finished'));
      if (res?.ok) {
        try {
          const arr = await (window as any).cards?.readAll?.();
          if (arr) replaceCards(arr as any);
        } catch {}
      }
    }) || undefined;

    const opts: any = { username };
    if (fromDate) opts.fromDate = fromDate;
    if (toDate) opts.toDate = toDate;

    setBusy(true);
    setStatus(`Starting ${target === 'chess' ? 'Chess.com' : 'Lichess'} scan...`);
    setProgress(null);
    void saveCardgenConfig();

    try {
      if (target === 'chess') {
        const run = window.autogen?.scanChessCom?.(opts);
        if (!run) throw new Error('Auto Add is not available in this build.');
        run.catch((e: any) => { finishScan(); setErr(e?.message || 'Scan failed to start.'); });
      } else {
        if (!window.autogen?.scanLichess) {
          throw new Error('Lichess scanning is not available in this build.');
        }
        const run = window.autogen.scanLichess(opts);
        if (!run) throw new Error('Lichess scan could not start.');
        run.catch((e: any) => { finishScan(); setErr(e?.message || 'Scan failed to start.'); });
      }
    } catch (e: any) {
      finishScan();
      setErr(e?.message || 'Failed to start Auto Add.');
    }
  };

  const cancelScan = async () => {
    try { window.autogen?.cancel?.(); } catch {}
    finishScan('Cancelled.');
  };

  const timeHint = () => {
    if (!fromDate && !toDate) return 'All games will be considered.';
    if (fromDate && toDate) return `Games between ${fromDate} and ${toDate} will be scanned.`;
    if (fromDate) return `Games on or after ${fromDate} will be scanned.`;
    return `Games up to ${toDate} will be scanned.`;
  };

  useEffect(() => {
    if (!busy) return;
    if (progress?.phase === 'done') {
      finishScan(progress.message || 'Scan complete.');
      (async () => {
        try {
          const arr = await (window as any).cards?.readAll?.();
          if (arr) replaceCards(arr as any);
        } catch {}
      })();
      return;
    }
    if (progress?.phase === 'start' && Math.max(0, Math.floor(progress.total ?? 0)) === 0) {
      finishScan(progress.message || 'No new games to scan.');
      return;
    }
    const total = Math.max(0, Math.floor(progress?.total ?? 0));
    const idx = Math.max(0, Math.floor(progress?.index ?? 0));
    const freshMs = Date.now() - lastProgressAt.current;
    if (busy && total > 0 && freshMs > 15000 && idx > 0) {
      // Fallback in case the backend misses a final done event
      finishScan('Finished (no further updates).');
    }
  }, [busy, progress, finishScan]);

  return (
    <div className="container">
      <div className="card grid" style={{ gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0 }}>Auto Add</h2>
            <div className="sub" style={{ marginTop: 2 }}>Choose a source, timeframe, and card defaults before scanning.</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="button secondary" onClick={() => navigate(-1)} title={`Back${backKeys ? ` (${backKeys})` : ''}`}>Back</button>
            {busy && <button className="button secondary" onClick={cancelScan}>Cancel</button>}
          </div>
        </div>

        <div className="section" style={{ display: 'grid', gap: 10 }}>
          <div style={{ fontWeight: 700 }}>Accounts</div>
          <div className="row" style={{ display: 'grid', gridTemplateColumns: '220px 1fr max-content max-content', gap: 12, alignItems: 'center' }}>
            <div style={{ color: chessEnabled ? 'inherit' : 'var(--muted)' }}>Chess.com</div>
            <div className="sub">Scan your Chess.com games</div>
            <input
              type="text"
              value={chessUser}
              onChange={e => { setChessUser(e.currentTarget.value); update({ chessComUser: e.currentTarget.value }); }}
              style={{ backgroundColor: '#ffffff', color: '#000000', border: '1px solid var(--border-strong)', borderRadius: 8, padding: '6px 8px', justifySelf: 'end', minWidth: 180, opacity: chessEnabled ? 1 : 0.5 }}
              placeholder="username"
              disabled={!chessEnabled}
            />
            <div style={{ justifySelf: 'end', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)' }}>
              <span className="sub">Scan</span>
              <ToggleSwitch checked={chessEnabled} onChange={(next) => { setChessEnabled(next); update({ chessComEnabled: next }); }} />
            </div>
          </div>
          <div className="row" style={{ display: 'grid', gridTemplateColumns: '220px 1fr max-content max-content', gap: 12, alignItems: 'center' }}>
            <div style={{ color: lichessEnabled ? 'inherit' : 'var(--muted)' }}>Lichess</div>
            <div className="sub">Scan your Lichess games</div>
            <input
              type="text"
              value={lichessUser}
              onChange={e => { setLichessUser(e.currentTarget.value); update({ lichessUser: e.currentTarget.value }); }}
              style={{ backgroundColor: '#ffffff', color: '#000000', border: '1px solid var(--border-strong)', borderRadius: 8, padding: '6px 8px', justifySelf: 'end', minWidth: 180, opacity: lichessEnabled ? 1 : 0.5 }}
              placeholder="username"
              disabled={!lichessEnabled}
            />
            <div style={{ justifySelf: 'end', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)' }}>
              <span className="sub">Scan</span>
              <ToggleSwitch checked={lichessEnabled} onChange={(next) => { setLichessEnabled(next); update({ lichessEnabled: next }); }} />
            </div>
          </div>
        </div>

        <div className="section" style={{ display: 'grid', gap: 10 }}>
          <div style={{ fontWeight: 700 }}>Timeframe</div>
          <div className="sub" style={{ marginBottom: 4 }}>Limit which games are scanned. Leave blank to scan all available games.</div>
          <div className="row" style={{ display: 'grid', gridTemplateColumns: '220px repeat(2, max-content)', gap: 12, alignItems: 'center' }}>
            <div>Dates</div>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span className="sub" style={{ color: 'inherit' }}>From (date)</span>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.currentTarget.value)} style={{ backgroundColor: '#ffffff', color: '#000000', border: '1px solid var(--border-strong)', borderRadius: 8, padding: '6px 8px' }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span className="sub" style={{ color: 'inherit' }}>To (date)</span>
              <input type="date" value={toDate} onChange={e => setToDate(e.currentTarget.value)} style={{ backgroundColor: '#ffffff', color: '#000000', border: '1px solid var(--border-strong)', borderRadius: 8, padding: '6px 8px' }} />
            </label>
          </div>
          <div className="sub">{timeHint()}</div>
        </div>

        <div className="section">
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Card Creation</div>
          <div className="sub" style={{ marginBottom: 8 }}>These defaults are applied when generating cards during Auto Add.</div>
          <CardCreationSettingsSection settings={settings} update={update} />
        </div>

        <div className="section" style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontWeight: 700 }}>Auto Add Status</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {!busy && <button className="button secondary" onClick={startScan}>Start</button>}
              {busy && <button className="button secondary" onClick={cancelScan}>Cancel</button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
