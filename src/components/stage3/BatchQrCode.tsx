import { useMemo } from 'react';

interface BatchQrCodeProps {
  payload: string;
  size?: number;
  label?: string;
}

const GRID_SIZE = 25;

function isFinderModule(row: number, col: number): boolean | null {
  const inTopLeft = row < 7 && col < 7;
  const inTopRight = row < 7 && col >= GRID_SIZE - 7;
  const inBottomLeft = row >= GRID_SIZE - 7 && col < 7;

  if (!inTopLeft && !inTopRight && !inBottomLeft) {
    return null;
  }

  const localRow = inBottomLeft ? row - (GRID_SIZE - 7) : row;
  const localCol = inTopRight ? col - (GRID_SIZE - 7) : col;

  // 7x7 outer ring, 5x5 white inner ring, 3x3 solid core
  if (
    localRow === 0 ||
    localRow === 6 ||
    localCol === 0 ||
    localCol === 6
  ) {
    return true;
  }
  if (
    localRow >= 2 &&
    localRow <= 4 &&
    localCol >= 2 &&
    localCol <= 4
  ) {
    return true;
  }
  return false;
}

function isSeparatorModule(row: number, col: number): boolean {
  if (row === 7 && (col < 8 || col >= GRID_SIZE - 8)) return true;
  if (col === 7 && (row < 8 || row >= GRID_SIZE - 8)) return true;
  if (row === GRID_SIZE - 8 && col < 8) return true;
  if (col === GRID_SIZE - 8 && row < 8) return true;
  return false;
}

function isAlignmentModule(row: number, col: number): boolean | null {
  // Small alignment marker near bottom-right (center at 18, 18)
  const dr = Math.abs(row - 18);
  const dc = Math.abs(col - 18);
  if (dr > 2 || dc > 2) return null;
  if (dr === 2 || dc === 2 || (dr === 0 && dc === 0)) return true;
  return false;
}

function buildQrMatrix(payload: string): boolean[][] {
  let seed = 0x811c9dc5;
  for (let i = 0; i < payload.length; i++) {
    seed = Math.imul(seed ^ payload.charCodeAt(i), 0x01000193);
  }

  const nextBit = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return ((seed >>> 0) & 1) === 1;
  };

  const matrix: boolean[][] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      const finder = isFinderModule(r, c);
      if (finder !== null) {
        row.push(finder);
        continue;
      }
      if (isSeparatorModule(r, c)) {
        row.push(false);
        continue;
      }
      const alignment = isAlignmentModule(r, c);
      if (alignment !== null) {
        row.push(alignment);
        continue;
      }
      // Timing patterns along row 6 and col 6
      if (r === 6 || c === 6) {
        row.push((r + c) % 2 === 0);
        continue;
      }
      row.push(nextBit());
    }
    matrix.push(row);
  }
  return matrix;
}

export function BatchQrCode({
  payload,
  size = 112,
  label = 'Batch Traceability QR Code',
}: BatchQrCodeProps) {
  const matrix = useMemo(() => buildQrMatrix(payload), [payload]);

  return (
    <div
      className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 shadow-2xs"
      style={{ width: size + 16, height: size + 16 }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${GRID_SIZE} ${GRID_SIZE}`}
        role="img"
        aria-label={label}
        shapeRendering="crispEdges"
      >
        <rect width={GRID_SIZE} height={GRID_SIZE} fill="#ffffff" />
        {matrix.map((row, r) =>
          row.map((filled, c) =>
            filled ? (
              <rect
                key={`${r}-${c}`}
                x={c}
                y={r}
                width={1}
                height={1}
                fill="#0f172a"
              />
            ) : null,
          ),
        )}
      </svg>
    </div>
  );
}
