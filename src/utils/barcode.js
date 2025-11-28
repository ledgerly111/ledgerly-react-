import QRCode from 'qrcode-generator';

const ERROR_LEVELS = new Set(['L', 'M', 'Q', 'H']);

export function createBarcodeDataUrl(value, options = {}) {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }
  if (typeof document === 'undefined') {
    return null;
  }

  const {
    size = 200,
    margin = 8,
    darkColor = '#000000',
    lightColor = '#ffffff',
    errorCorrectionLevel = 'M',
  } = options;

  try {
    const level = ERROR_LEVELS.has(String(errorCorrectionLevel).toUpperCase())
      ? String(errorCorrectionLevel).toUpperCase()
      : 'M';
    const qr = QRCode(0, level);
    qr.addData(value);
    qr.make();

    const moduleCount = qr.getModuleCount();
    if (!moduleCount) {
      return null;
    }

    const cellSize = Math.max(
      1,
      Math.floor((size - margin * 2) / moduleCount),
    );
    const qrSize = cellSize * moduleCount + margin * 2;

    const canvas = document.createElement('canvas');
    canvas.width = qrSize;
    canvas.height = qrSize;
    const context = canvas.getContext('2d');
    if (!context) {
      canvas.remove();
      return null;
    }

    context.fillStyle = lightColor;
    context.fillRect(0, 0, qrSize, qrSize);

    context.fillStyle = darkColor;
    for (let row = 0; row < moduleCount; row += 1) {
      for (let col = 0; col < moduleCount; col += 1) {
        if (qr.isDark(row, col)) {
          const posX = margin + col * cellSize;
          const posY = margin + row * cellSize;
          context.fillRect(posX, posY, cellSize, cellSize);
        }
      }
    }

    const dataUrl = canvas.toDataURL('image/png');
    canvas.remove();
    return dataUrl;
  } catch (error) {
    console.error('Failed to generate QR code', error);
    return null;
  }
}

export function isBarcodeDataUrl(value) {
  return typeof value === 'string' && value.startsWith('data:image');
}
