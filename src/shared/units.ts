/** Scene units are millimeters. 1 Three.js unit = 1 mm. */
export const MM = 1;

export function mm(n: number): number {
  return n * MM;
}

export type RGB = [number, number, number];

export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: RGB): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

export const FILAMENT_PRESETS: { id: string; name: string; nameTh: string; hex: string }[] = [
  { id: 'black', name: 'Black', nameTh: 'ดำ', hex: '#161616' },
  { id: 'white', name: 'White', nameTh: 'ขาว', hex: '#f7f7f5' },
  { id: 'gray', name: 'Gray', nameTh: 'เทา', hex: '#8c8c90' },
  { id: 'red', name: 'Red', nameTh: 'แดง', hex: '#c8102e' },
  { id: 'orange', name: 'Orange', nameTh: 'ส้ม', hex: '#ff6a13' },
  { id: 'yellow', name: 'Yellow', nameTh: 'เหลือง', hex: '#f5c518' },
  { id: 'green', name: 'Green', nameTh: 'เขียว', hex: '#00ae42' },
  { id: 'cyan', name: 'Cyan', nameTh: 'ฟ้า', hex: '#0086d6' },
  { id: 'blue', name: 'Blue', nameTh: 'น้ำเงิน', hex: '#0a5cd5' },
  { id: 'purple', name: 'Purple', nameTh: 'ม่วง', hex: '#8e44ad' },
  { id: 'pink', name: 'Pink', nameTh: 'ชมพู', hex: '#e6398b' },
  { id: 'gold', name: 'Gold', nameTh: 'ทอง', hex: '#f59e0b' },
  { id: 'navy', name: 'Navy', nameTh: 'กรมท่า', hex: '#0f172a' },
  { id: 'beige', name: 'Beige', nameTh: 'เบจ', hex: '#d9c8a9' },
  { id: 'brown', name: 'Brown', nameTh: 'น้ำตาล', hex: '#7a5230' },
  { id: 'skin', name: 'Skin', nameTh: 'ผิว', hex: '#ffd7b5' },
];

/** `<option>` list for filament color presets (value = hex). */
export function filamentOptionsHtml(selectedHex: string): string {
  const opts = FILAMENT_PRESETS.map(
    (p) =>
      `<option value="${p.hex}"${p.hex.toLowerCase() === selectedHex.toLowerCase() ? ' selected' : ''}>${p.nameTh} / ${p.name}</option>`,
  );
  const custom = FILAMENT_PRESETS.some((p) => p.hex.toLowerCase() === selectedHex.toLowerCase())
    ? ''
    : `<option value="${selectedHex}" selected>กำหนดเอง</option>`;
  return `${custom}${opts.join('')}`;
}
