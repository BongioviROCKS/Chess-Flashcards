import React, { useMemo } from 'react';
import { Chess } from 'chess.js';

type Orientation = 'white' | 'black';

type BoardProps = {
  fen: string;
  size?: number;
  orientation?: Orientation;
  /** highlight the last move's from/to squares (algebraic, e.g. "e2","e4") */
  highlight?: { from?: string; to?: string } | null;
  /** show algebraic coordinate guides on the board */
  showCoordinates?: boolean;
};

/** fallback to start if FEN is bad */
const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const PIECE_UNICODE: Record<string, string> = {
  // white
  K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
  // black
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟',
};

function safeFen(fen: string): string {
  try {
    // Will throw if invalid
    // eslint-disable-next-line no-new
    new Chess(fen);
    return fen;
  } catch {
    return START_FEN;
  }
}

function squareToFileRank(sq: string): [number, number] | null {
  if (!/^[a-h][1-8]$/.test(sq)) return null;
  const file = sq.charCodeAt(0) - 97; // a=0..h=7
  const rank = parseInt(sq[1], 10) - 1; // 1..8 -> 0..7
  return [file, rank];
}

/** map file/rank (0..7) to draw coords depending on orientation */
function fileRankToXY(
  file: number,
  rank: number,
  orientation: Orientation,
): { x: number; y: number } {
  // In chess coords: a1 is white's bottom-left.
  // SVG y grows downward; we'll map (0,0) to top-left in screen space.
  if (orientation === 'white') {
    // rank 7 at top, 0 at bottom
    return { x: file, y: 7 - rank };
  } else {
    // flip horizontally and vertically
    return { x: 7 - file, y: rank };
  }
}

export default function Board({
  fen,
  size = 360,
  orientation = 'white',
  highlight = null,
  showCoordinates = false,
}: BoardProps) {
  const sFen = useMemo(() => safeFen(fen), [fen]);

  const data = useMemo(() => {
    const chess = new Chess(sFen);
    // 8x8 matrix from a8..h1 top->bottom, but we will map using file/rank
    const board = chess.board();
    return board;
  }, [sFen]);

  // square size in px
  const sq = size / 8;

  // prepare highlight rects
  const hlRects: Array<{ x: number; y: number }> = useMemo(() => {
    const out: Array<{ x: number; y: number }> = [];
    if (highlight?.from) {
      const fr = squareToFileRank(highlight.from);
      if (fr) {
        const { x, y } = fileRankToXY(fr[0], fr[1], orientation);
        out.push({ x, y });
      }
    }
    if (highlight?.to) {
      const tr = squareToFileRank(highlight.to);
      if (tr) {
        const { x, y } = fileRankToXY(tr[0], tr[1], orientation);
        out.push({ x, y });
      }
    }
    return out;
  }, [highlight, orientation]);

  const coordTextStyle = useMemo<React.CSSProperties>(() => ({
    fill: 'rgba(255, 255, 255, 0.95)',
    stroke: 'rgba(0, 0, 0, 0.8)',
    strokeWidth: 0.04,
    paintOrder: 'stroke fill',
    fontWeight: 600,
    pointerEvents: 'none',
    userSelect: 'none',
  }), []);

  const fileLabels = useMemo(() => {
    if (!showCoordinates) return [];
    const bottomRank = orientation === 'white' ? 0 : 7;
    return Array.from({ length: 8 }, (_, file) => {
      const { x, y } = fileRankToXY(file, bottomRank, orientation);
      return {
        label: String.fromCharCode(65 + file),
        x,
        y,
      };
    });
  }, [orientation, showCoordinates]);

  const rankLabels = useMemo(() => {
    if (!showCoordinates) return [];
    const firstFile = orientation === 'white' ? 0 : 7;
    return Array.from({ length: 8 }, (_, rank) => {
      const { x, y } = fileRankToXY(firstFile, rank, orientation);
      return {
        label: String(rank + 1),
        x,
        y,
      };
    });
  }, [orientation, showCoordinates]);

  return (
    <svg
      role="img"
      aria-label="Chess board"
      width={size}
      height={size}
      viewBox="0 0 8 8"
      style={{ borderRadius: 8, overflow: 'hidden', boxShadow: '0 0 0 1px var(--border-strong)' }}
    >
      {/* squares */}
      {Array.from({ length: 64 }, (_, idx) => {
        const x = idx % 8;
        const y = Math.floor(idx / 8);
        // we need to invert mapping to compute color pattern correctly regardless of orientation
        // draw coordinates are already top-left origin; color pattern should be consistent (a1 = dark)
        const isLight = (x + y) % 2 === 0;
        return (
          <rect
            key={`sq-${x}-${y}`}
            x={x}
            y={y}
            width={1}
            height={1}
            fill={isLight ? 'var(--board-light, #EEE)' : 'var(--board-dark, #769656)'}
          />
        );
      })}

      {/* highlights on top of squares */}
      {hlRects.map(({ x, y }, i) => (
        <rect
          key={`hl-${i}`}
          x={x}
          y={y}
          width={1}
          height={1}
          fill="var(--accent, #ffd54f)"
          opacity={0.6}
        />
      ))}

      {/* pieces */}
      {(() => {
        const nodes: React.ReactNode[] = [];
        // chess.board() returns rows from 8->1; we'll iterate by file/rank instead
        for (let file = 0; file < 8; file++) {
          for (let rank = 0; rank < 8; rank++) {
            const { x, y } = fileRankToXY(file, rank, orientation);
            // Convert to chess.board() indexing:
            // chess.board()[row][col] where row 0 = 8th rank, col 0 = a-file
            const row = 7 - rank; // 8->1 maps to 0..7
            const col = file;
            const square = data[row][col];
            if (!square) continue;
            const glyph = PIECE_UNICODE[square.color === 'w' ? square.type.toUpperCase() : square.type];
            if (!glyph) continue;
            nodes.push(
              <text
                key={`p-${file}-${rank}`}
                x={x + 0.5}
                y={y + 0.78}
                fontSize={0.88}
                textAnchor="middle"
                style={{ userSelect: 'none' }}
              >
                {glyph}
              </text>
            );
          }
        }
        return nodes;
      })()}

      {showCoordinates && (
        <>
          {fileLabels.map(({ label, x, y }) => (
            <text
              key={`file-${label}`}
              x={x + 0.94}
              y={y + 0.94}
              fontSize={0.28}
              textAnchor="end"
              dominantBaseline="ideographic"
              aria-hidden="true"
              style={coordTextStyle}
            >
              {label}
            </text>
          ))}
          {rankLabels.map(({ label, x, y }) => (
            <text
              key={`rank-${label}`}
              x={x + 0.06}
              y={y + 0.18}
              fontSize={0.28}
              textAnchor="start"
              dominantBaseline="hanging"
              aria-hidden="true"
              style={coordTextStyle}
            >
              {label}
            </text>
          ))}
        </>
      )}
    </svg>
  );
}
