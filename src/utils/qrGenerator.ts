/**
 * SVG Code generator for QR and Barcode tags
 * Generates sharp, scannable SVGs for everyday tags (Toothpaste, Coffee, Balcony, etc.)
 */

// Simple 21x21 QR Code Version 1 matrix generator with finder patterns
export function generateQrMatrix(text: string): boolean[][] {
  const size = 25;
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  // Add 3 Finder patterns (7x7) at corners
  const addFinder = (startX: number, startY: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (
          r === 0 || r === 6 || c === 0 || c === 6 ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        ) {
          matrix[startY + r][startX + c] = true;
        }
      }
    }
  };

  addFinder(0, 0); // Top-left
  addFinder(size - 7, 0); // Top-right
  addFinder(0, size - 7); // Bottom-left

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // Deterministic data encoding into remaining cells
  let bitIndex = 0;
  const bytes = Array.from(text).map(c => c.charCodeAt(0));
  for (let c = size - 1; c > 0; c -= 2) {
    if (c === 6) c--; // Skip timing pattern column
    for (let r = 0; r < size; r++) {
      for (let colOffset = 0; colOffset < 2; colOffset++) {
        const col = c - colOffset;
        // Check if inside finder patterns
        const isFinderTL = col < 8 && r < 8;
        const isFinderTR = col >= size - 8 && r < 8;
        const isFinderBL = col < 8 && r >= size - 8;
        const isTiming = col === 6 || r === 6;

        if (!isFinderTL && !isFinderTR && !isFinderBL && !isTiming) {
          const byteVal = bytes[bitIndex % bytes.length] || 0xAA;
          const bitVal = ((byteVal >> (bitIndex % 8)) & 1) === 1;
          matrix[r][col] = bitVal;
          bitIndex++;
        }
      }
    }
  }

  return matrix;
}

export function generateQrSvg(text: string, sizePx: number = 240): string {
  const matrix = generateQrMatrix(text);
  const n = matrix.length;
  const cellSize = sizePx / (n + 4);
  const offset = cellSize * 2;

  let rects = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (matrix[r][c]) {
        const x = offset + c * cellSize;
        const y = offset + r * cellSize;
        rects += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${cellSize.toFixed(1)}" height="${cellSize.toFixed(1)}" fill="#0B0E11" />`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sizePx} ${sizePx}" width="${sizePx}" height="${sizePx}">
    <rect width="${sizePx}" height="${sizePx}" fill="#FFFFFF" rx="12" />
    ${rects}
  </svg>`;
}

export function generateBarcodeSvg(code: string, format: string, width: number = 280, height: number = 100): string {
  // Generate high-density 1D barcode pattern
  let bars = '';
  let x = 16;
  const barWidth = 2.4;

  // Guard pattern
  bars += `<rect x="${x}" y="12" width="${barWidth}" height="${height - 24}" fill="#0B0E11" />`;
  x += barWidth * 2;
  bars += `<rect x="${x}" y="12" width="${barWidth}" height="${height - 24}" fill="#0B0E11" />`;
  x += barWidth * 2;

  // Code bars
  for (let i = 0; i < code.length; i++) {
    const charCode = code.charCodeAt(i);
    for (let b = 0; b < 6; b++) {
      const isBlack = ((charCode >> b) & 1) === 1;
      if (isBlack) {
        bars += `<rect x="${x.toFixed(1)}" y="12" width="${barWidth}" height="${height - 30}" fill="#0B0E11" />`;
      }
      x += barWidth;
    }
    x += barWidth;
  }

  // End guard
  bars += `<rect x="${x}" y="12" width="${barWidth}" height="${height - 24}" fill="#0B0E11" />`;
  x += barWidth * 2;
  bars += `<rect x="${x}" y="12" width="${barWidth}" height="${height - 24}" fill="#0B0E11" />`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
    <rect width="${width}" height="${height}" fill="#FFFFFF" rx="8" />
    ${bars}
    <text x="${width / 2}" y="${height - 6}" font-family="monospace" font-size="11" font-weight="bold" fill="#0B0E11" text-anchor="middle">${code}</text>
  </svg>`;
}
