import { Card } from '../data/types';

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/** Canonical key for a FEN: only the first 4 fields. */
export function fenKey(fen: string): string {
  try {
    return String(fen || '').trim().split(/\s+/).slice(0, 4).join(' ');
  } catch {
    return '';
  }
}

/** Ensure a FEN is loadable by chess.js by filling in missing counters. */
export function ensureFullFen(fen: string): string {
  const trimmed = String(fen || '').trim();
  if (!trimmed) return START_FEN;

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 6) return parts.slice(0, 6).join(' ');
  if (parts.length === 5) return [...parts.slice(0, 5), '1'].join(' ');

  const key = fenKey(trimmed);
  return key ? `${key} 0 1` : START_FEN;
}

export function fenEquals(a?: string | null, b?: string | null): boolean {
  return fenKey(a || '') === fenKey(b || '');
}

export function normalizeCardFens(card: Card): Card {
  const next: Card = {
    ...card,
    fields: { ...(card.fields as any) },
  };

  const setIf = (obj: any, key: string) => {
    if (obj && typeof obj[key] === 'string') {
      obj[key] = fenKey(obj[key]);
    }
  };

  if (next.fields) {
    setIf(next.fields, 'fen');
    setIf(next.fields, 'answerFen');

    const cc = next.fields.creationCriteria as any;
    if (cc && typeof cc === 'object') {
      next.fields.creationCriteria = { ...cc };
      const input = next.fields.creationCriteria.input as any;
      if (input && typeof input === 'object') {
        next.fields.creationCriteria.input = { ...input };
        setIf(next.fields.creationCriteria.input, 'fen');
      }
    }
  }

  return next;
}

export function normalizeCards(cards: Card[]): Card[] {
  if (!Array.isArray(cards)) return [];
  return cards.map(normalizeCardFens);
}
