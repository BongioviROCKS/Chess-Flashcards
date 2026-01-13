import React from 'react';
import type { Settings } from '../state/settings';

type Props = {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
};

const clampInt = (v: number, min: number, max?: number) => {
  if (!Number.isFinite(v)) return min;
  const next = Math.floor(v);
  if (typeof max === 'number' && next > max) return max;
  return Math.max(min, next);
};

export default function CardCreationSettingsSection({ settings, update }: Props) {
  const setAcceptance = (next: number) => {
    if (!Number.isFinite(next) || next < 0) next = 0;
    const rounded = Math.round(next * 100) / 100;
    update({ otherAnswersAcceptance: rounded });
  };
  const acceptance = Number(settings.otherAnswersAcceptance ?? 0);
  const acceptanceStr = acceptance.toFixed(2);
  const STEP_ACC = 0.01;
  const incAcc = () => setAcceptance(acceptance + STEP_ACC);
  const decAcc = () => setAcceptance(acceptance - STEP_ACC);
  const onAccKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'ArrowUp') { e.preventDefault(); incAcc(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); decAcc(); }
  };

  const moac = settings.maxOtherAnswerCount;
  const setMoac = (next: number) => {
    update({ maxOtherAnswerCount: clampInt(next, 0, 50) });
  };
  const incMoac = () => setMoac(moac + 1);
  const decMoac = () => setMoac(moac - 1);
  const onMoacKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'ArrowUp') { e.preventDefault(); incMoac(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); decMoac(); }
  };

  const depth = settings.stockfishDepth;
  const setDepth = (next: number) => {
    update({ stockfishDepth: clampInt(next, 1, 99) });
  };
  const incDepth = () => setDepth(depth + 1);
  const decDepth = () => setDepth(depth - 1);
  const onDepthKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'ArrowUp') { e.preventDefault(); incDepth(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); decDepth(); }
  };

  return (
    <>
      <div className="row" title="Accept alternative moves within this pawn value of the best move" style={{ display: 'grid', gridTemplateColumns: '220px 1fr max-content', gap: 12, alignItems: 'center' }}>
        <div>Other Answers Acceptance</div>
        <div className="sub">Centipawn threshold</div>
        <div className="num-wrap" style={{ justifySelf: 'end' }}>
          <input
            className="num-accept no-native-spin"
            type="text"
            inputMode="decimal"
            value={acceptanceStr}
            onChange={e => { const num = parseFloat(e.currentTarget.value); setAcceptance(num); }}
            onKeyDown={onAccKeyDown}
            onBlur={(e) => { const num = parseFloat(e.currentTarget.value); setAcceptance(num); }}
            style={{ backgroundColor: '#ffffff', color: '#000000', border: '1px solid var(--border-strong)', borderRadius: 8, padding: '6px 8px', width: 60, minWidth: 'unset', maxWidth: 60, display: 'inline-block', textAlign: 'right', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}
            title="e.g., 0.20 = 20 centipawns"
          />
          <div className="num-stepper" aria-hidden="false">
            <button type="button" className="step up" onClick={incAcc} title="Increase by 0.01" aria-label="Increase">▲</button>
            <button type="button" className="step down" onClick={decAcc} title="Decrease by 0.01" aria-label="Decrease">▼</button>
          </div>
        </div>
      </div>

      <div className="row" title="Number of alternative moves to keep when creating cards" style={{ display: 'grid', gridTemplateColumns: '220px 1fr max-content', gap: 12, alignItems: 'center' }}>
        <div>Max Other Answer Count</div>
        <div className="sub">MultiPV alternatives</div>
        <div className="num-wrap" style={{ justifySelf: 'end' }}>
          <input className="no-native-spin" type="text" inputMode="numeric" value={String(moac)}
            onChange={e => setMoac(parseInt(e.currentTarget.value, 10))}
            onKeyDown={onMoacKeyDown}
            onBlur={e => setMoac(parseInt(e.currentTarget.value, 10))}
            style={{ backgroundColor: '#ffffff', color: '#000000', border: '1px solid var(--border-strong)', borderRadius: 8, padding: '6px 8px', width: 70, minWidth: 'unset', maxWidth: 80, display: 'inline-block', textAlign: 'right', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace' }}
          />
          <div className="num-stepper" aria-hidden="false">
            <button type="button" className="step up" onClick={incMoac} title="Increase by 1" aria-label="Increase">▲</button>
            <button type="button" className="step down" onClick={decMoac} title="Decrease by 1" aria-label="Decrease">▼</button>
          </div>
        </div>
      </div>

      <div className="row" title="Engine search depth (higher = stronger & slower)" style={{ display: 'grid', gridTemplateColumns: '220px 1fr max-content', gap: 12, alignItems: 'center' }}>
        <div>Engine Depth</div>
        <div className="sub">Stockfish depth</div>
        <div className="num-wrap" style={{ justifySelf: 'end' }}>
          <input className="no-native-spin" type="text" inputMode="numeric" value={String(depth)}
            onChange={e => setDepth(parseInt(e.currentTarget.value, 10))}
            onKeyDown={onDepthKeyDown}
            onBlur={e => setDepth(parseInt(e.currentTarget.value, 10))}
            style={{ backgroundColor: '#ffffff', color: '#000000', border: '1px solid var(--border-strong)', borderRadius: 8, padding: '6px 8px', width: 70, minWidth: 'unset', maxWidth: 80, display: 'inline-block', textAlign: 'right', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}
          />
          <div className="num-stepper" aria-hidden="false">
            <button type="button" className="step up" onClick={incDepth} title="Increase by 1" aria-label="Increase">▲</button>
            <button type="button" className="step down" onClick={decDepth} title="Decrease by 1" aria-label="Decrease">▼</button>
          </div>
        </div>
      </div>
    </>
  );
}
