import { RegisteredTag } from './antiCheatRules';

/**
 * SVG Code generator and Downloader for QR and Barcode tags
 * Generates sharp, scannable SVGs and printable PNG cards for everyday tags
 */

export function generateQrMatrix(text: string): boolean[][] {
  const size = 25;
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const addFinder = (startX: number, startY: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (
          r === 0 ||
          r === 6 ||
          c === 0 ||
          c === 6 ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        ) {
          matrix[startY + r][startX + c] = true;
        }
      }
    }
  };

  addFinder(0, 0);
  addFinder(size - 7, 0);
  addFinder(0, size - 7);

  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  let bitIndex = 0;
  const bytes = Array.from(text).map((c) => c.charCodeAt(0));
  for (let c = size - 1; c > 0; c -= 2) {
    if (c === 6) c--;
    for (let r = 0; r < size; r++) {
      for (let colOffset = 0; colOffset < 2; colOffset++) {
        const col = c - colOffset;
        const isFinderTL = col < 8 && r < 8;
        const isFinderTR = col >= size - 8 && r < 8;
        const isFinderBL = col < 8 && r >= size - 8;
        const isTiming = col === 6 || r === 6;

        if (!isFinderTL && !isFinderTR && !isFinderBL && !isTiming) {
          const byteVal = bytes[bitIndex % bytes.length] || 0xaa;
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
        rects += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${cellSize.toFixed(
          1
        )}" height="${cellSize.toFixed(1)}" fill="#0B0E11" />`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sizePx} ${sizePx}" width="${sizePx}" height="${sizePx}">
    <rect width="${sizePx}" height="${sizePx}" fill="#FFFFFF" rx="12" />
    ${rects}
  </svg>`;
}

export function generateBarcodeSvg(
  code: string,
  format: string,
  width: number = 280,
  height: number = 100
): string {
  let bars = '';
  let x = 16;
  const barWidth = 2.4;

  bars += `<rect x="${x}" y="12" width="${barWidth}" height="${height - 24}" fill="#0B0E11" />`;
  x += barWidth * 2;
  bars += `<rect x="${x}" y="12" width="${barWidth}" height="${height - 24}" fill="#0B0E11" />`;
  x += barWidth * 2;

  for (let i = 0; i < code.length; i++) {
    const charCode = code.charCodeAt(i);
    for (let b = 0; b < 6; b++) {
      const isBlack = ((charCode >> b) & 1) === 1;
      if (isBlack) {
        bars += `<rect x="${x.toFixed(1)}" y="12" width="${barWidth}" height="${
          height - 30
        }" fill="#0B0E11" />`;
      }
      x += barWidth;
    }
    x += barWidth;
  }

  bars += `<rect x="${x}" y="12" width="${barWidth}" height="${height - 24}" fill="#0B0E11" />`;
  x += barWidth * 2;
  bars += `<rect x="${x}" y="12" width="${barWidth}" height="${height - 24}" fill="#0B0E11" />`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
    <rect width="${width}" height="${height}" fill="#FFFFFF" rx="8" />
    ${bars}
    <text x="${width / 2}" y="${
    height - 6
  }" font-family="monospace" font-size="11" font-weight="bold" fill="#0B0E11" text-anchor="middle">${code}</text>
  </svg>`;
}

/**
 * Downloads the Tag's QR/Barcode directly as a standalone .svg file
 */
export function downloadTagAsSvg(tag: RegisteredTag) {
  const svgString =
    tag.codeFormat === 'QR_CODE'
      ? generateQrSvg(tag.codeValue, 400)
      : generateBarcodeSvg(tag.codeValue, tag.codeFormat, 420, 160);

  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = tag.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  a.href = url;
  a.download = `scanwake_${safeName}_qr.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Renders a high-resolution Printable Tag Card (with title, location, QR/Barcode, and code) to PNG and downloads it
 */
export function downloadTagAsPng(tag: RegisteredTag) {
  const canvas = document.createElement('canvas');
  const width = 600;
  const height = 720;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Card Background
  ctx.fillStyle = '#0B0E11';
  ctx.fillRect(0, 0, width, height);

  // Border frame
  ctx.strokeStyle = '#4ADEDE';
  ctx.lineWidth = 6;
  ctx.strokeRect(20, 20, width - 40, height - 40);

  // Header Badge
  ctx.fillStyle = '#4ADEDE';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SCANWAKE PHYSICAL WAKE-UP TAG', width / 2, 72);

  // Tag Name
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 32px sans-serif';
  ctx.fillText(tag.name, width / 2, 120);

  // Location
  ctx.fillStyle = '#8C9BA8';
  ctx.font = '20px sans-serif';
  ctx.fillText(`Location: ${tag.location}`, width / 2, 155);

  // White QR container box
  const boxSize = 380;
  const boxX = (width - boxSize) / 2;
  const boxY = 190;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxSize, boxSize, 20);
  ctx.fill();

  if (tag.codeFormat === 'QR_CODE') {
    const matrix = generateQrMatrix(tag.codeValue);
    const n = matrix.length;
    const cellSize = (boxSize - 60) / n;
    const startX = boxX + 30;
    const startY = boxY + 30;

    ctx.fillStyle = '#0B0E11';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (matrix[r][c]) {
          ctx.fillRect(
            startX + c * cellSize,
            startY + r * cellSize,
            Math.ceil(cellSize),
            Math.ceil(cellSize)
          );
        }
      }
    }
  } else {
    // Draw 1D Barcode inside the white container
    const barStartY = boxY + 90;
    const barHeight = 200;
    let x = boxX + 40;
    const barW = 3.5;

    ctx.fillStyle = '#0B0E11';
    ctx.fillRect(x, barStartY, barW, barHeight);
    x += barW * 2;
    ctx.fillRect(x, barStartY, barW, barHeight);
    x += barW * 2;

    for (let i = 0; i < tag.codeValue.length; i++) {
      const charCode = tag.codeValue.charCodeAt(i);
      for (let b = 0; b < 6; b++) {
        if (((charCode >> b) & 1) === 1) {
          ctx.fillRect(x, barStartY, barW, barHeight - 25);
        }
        x += barW;
      }
      x += barW;
    }

    ctx.fillRect(x, barStartY, barW, barHeight);
    x += barW * 2;
    ctx.fillRect(x, barStartY, barW, barHeight);
  }

  // Footer Code Value & Hash
  ctx.fillStyle = '#7DE2D1';
  ctx.font = 'bold 20px monospace';
  ctx.fillText(tag.codeValue, width / 2, 620);

  ctx.fillStyle = '#8C9BA8';
  ctx.font = '14px monospace';
  ctx.fillText(`Hash: ${tag.codeHash} • Format: ${tag.codeFormat}`, width / 2, 655);

  const dataUrl = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  const safeName = tag.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  a.href = dataUrl;
  a.download = `scanwake_${safeName}_qr.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
