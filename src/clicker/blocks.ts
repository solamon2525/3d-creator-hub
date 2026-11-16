export type BlockPreset = 'single' | 'row2' | 'row3' | 'row4' | 'grid2x2' | 'wasd' | 'arrows';

export interface KeySlot {
  x: number; // mm offset from center
  y: number; // mm offset from center
  label: string;
}

export interface BlockLayout {
  id: BlockPreset;
  name: string;
  keys: KeySlot[];
  width: number;
  height: number;
  cornerRadius: number;
}

export const BLOCK_PRESETS: Record<BlockPreset, { name: string; layout: (pitch?: number) => BlockLayout }> = {
  single: {
    name: '1 ปุ่ม (Single)',
    layout: () => ({
      id: 'single',
      name: 'Single 1x1',
      keys: [{ x: 0, y: 0, label: '1' }],
      width: 28,
      height: 28,
      cornerRadius: 6,
    }),
  },
  row2: {
    name: 'แถวยาว 2 ปุ่ม (Row 1x2)',
    layout: (pitch = 20.0) => ({
      id: 'row2',
      name: 'Row 1x2',
      keys: [
        { x: -pitch / 2, y: 0, label: '1' },
        { x: pitch / 2, y: 0, label: '2' },
      ],
      width: pitch + 16,
      height: 28,
      cornerRadius: 6,
    }),
  },
  row3: {
    name: 'แถวยาว 3 ปุ่ม (Row 1x3)',
    layout: (pitch = 20.0) => ({
      id: 'row3',
      name: 'Row 1x3',
      keys: [
        { x: -pitch, y: 0, label: '1' },
        { x: 0, y: 0, label: '2' },
        { x: pitch, y: 0, label: '3' },
      ],
      width: pitch * 2 + 16,
      height: 28,
      cornerRadius: 6,
    }),
  },
  row4: {
    name: 'แถวยาว 4 ปุ่ม (Row 1x4)',
    layout: (pitch = 20.0) => ({
      id: 'row4',
      name: 'Row 1x4',
      keys: [
        { x: -pitch * 1.5, y: 0, label: '1' },
        { x: -pitch * 0.5, y: 0, label: '2' },
        { x: pitch * 0.5, y: 0, label: '3' },
        { x: pitch * 1.5, y: 0, label: '4' },
      ],
      width: pitch * 3 + 16,
      height: 28,
      cornerRadius: 6,
    }),
  },
  grid2x2: {
    name: 'ตาราง 4 ปุ่ม (Grid 2x2)',
    layout: (pitch = 20.0) => ({
      id: 'grid2x2',
      name: 'Grid 2x2',
      keys: [
        { x: -pitch / 2, y: pitch / 2, label: '1' },
        { x: pitch / 2, y: pitch / 2, label: '2' },
        { x: -pitch / 2, y: -pitch / 2, label: '3' },
        { x: pitch / 2, y: -pitch / 2, label: '4' },
      ],
      width: pitch + 16,
      height: pitch + 16,
      cornerRadius: 6,
    }),
  },
  wasd: {
    name: 'คลัสเตอร์เกมมิ่ง WASD',
    layout: (pitch = 20.0) => ({
      id: 'wasd',
      name: 'WASD Cluster',
      keys: [
        { x: 0, y: pitch / 2, label: 'W' },
        { x: -pitch, y: -pitch / 2, label: 'A' },
        { x: 0, y: -pitch / 2, label: 'S' },
        { x: pitch, y: -pitch / 2, label: 'D' },
      ],
      width: pitch * 2 + 16,
      height: pitch + 16,
      cornerRadius: 6,
    }),
  },
  arrows: {
    name: 'ปุ่มลูกศร (Arrow Keys)',
    layout: (pitch = 20.0) => ({
      id: 'arrows',
      name: 'Arrow Keys',
      keys: [
        { x: 0, y: pitch / 2, label: '▲' },
        { x: -pitch, y: -pitch / 2, label: '◄' },
        { x: 0, y: -pitch / 2, label: '▼' },
        { x: pitch, y: -pitch / 2, label: '►' },
      ],
      width: pitch * 2 + 16,
      height: pitch + 16,
      cornerRadius: 6,
    }),
  },
};
