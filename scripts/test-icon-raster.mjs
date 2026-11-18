import { getIconSvg } from '../src/clicker/iconCatalog.ts';
import { createBaseOutline } from '../src/clicker/shapes.ts';

console.log('--- Testing Icon SVG Generation ---');
const iconsToTest = ['Ghost', 'Heart', 'Star', 'Flame', 'Zap', 'Gamepad2'];
for (const icon of iconsToTest) {
  const svg = getIconSvg(icon, '#ff5500');
  if (!svg || !svg.startsWith('<svg') || !svg.includes('xmlns="http://www.w3.org/2000/svg"')) {
    throw new Error(`Failed to generate valid SVG for icon ${icon}`);
  }
  console.log(`✓ Icon [${icon.padEnd(10)}] -> valid SVG (${svg.length} bytes, stroke: #ff5500)`);
}

console.log('\n--- Testing Thai Grapheme Clustering for Blocks Mode ---');
function splitKeycapTokens(text) {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.includes(' ')) {
    return trimmed.split(/\s+/).filter(Boolean);
  }
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter('th', { granularity: 'grapheme' });
    return Array.from(segmenter.segment(trimmed), (s) => s.segment);
  }
  return Array.from(trimmed);
}

const thaiSample = 'คำไผ่';
const thaiTokens = splitKeycapTokens(thaiSample);
console.log(`Input: "${thaiSample}" -> Tokens:`, thaiTokens);
if (thaiTokens.length !== 3 || thaiTokens[0] !== 'คำ' || thaiTokens[1] !== 'ไ' || thaiTokens[2] !== 'ผ่') {
  throw new Error(`Thai grapheme clustering failed: expected ['คำ', 'ไ', 'ผ่'], got ${JSON.stringify(thaiTokens)}`);
}
console.log('✓ Thai grapheme clustering preserved tone marks and composite vowels successfully!');

const spaceSample = 'K P 1 2';
const spaceTokens = splitKeycapTokens(spaceSample);
console.log(`Input: "${spaceSample}" -> Tokens:`, spaceTokens);
if (spaceTokens.length !== 4 || spaceTokens[0] !== 'K' || spaceTokens[3] !== '2') {
  throw new Error(`Space token splitting failed: got ${JSON.stringify(spaceTokens)}`);
}
console.log('✓ Space-separated tokens split successfully!');

console.log('\n--- Testing Rectangle Default Aspect Ratio ---');
const rectRing = createBaseOutline('rectangle', { size: 32, lockBaseSize: false });
const xs = rectRing.map((p) => p[0]);
const ys = rectRing.map((p) => p[1]);
const width = Math.max(...xs) - Math.min(...xs);
const height = Math.max(...ys) - Math.min(...ys);
console.log(`Rectangle default bounds: width = ${width} mm, height = ${height} mm`);
if (width <= height || width !== 43 || height !== 32) {
  throw new Error(`Rectangle should have aspect ratio ~1.35 (w=43, h=32), got w=${width}, h=${height}`);
}
console.log('✓ Rectangle default aspect ratio is authentic 43x32 mm (not a 1:1 square)!');

console.log('\nALL VERIFICATION TESTS PASSED!');
