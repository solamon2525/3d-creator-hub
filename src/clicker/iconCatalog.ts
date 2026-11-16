import * as icons from 'lucide';

export interface IconCategory {
  id: string;
  label: string;
  iconNames: string[];
}

export const ICON_CATEGORIES: IconCategory[] = [
  {
    id: 'popular',
    label: 'ยอดนิยม (Popular)',
    iconNames: [
      'Heart', 'Star', 'Sparkles', 'Flame', 'Zap', 'Smile', 'Ghost', 'Crown',
      'Trophy', 'Gamepad2', 'Music', 'Cat', 'Dog', 'Rocket', 'Sun', 'Moon'
    ],
  },
  {
    id: 'gaming',
    label: 'เกมมิ่ง (Gaming)',
    iconNames: [
      'Gamepad', 'Gamepad2', 'Swords', 'Shield', 'Trophy', 'Crown', 'Crosshair',
      'Dices', 'Ghost', 'Skull', 'Target', 'Bomb', 'Flame', 'Sparkles'
    ],
  },
  {
    id: 'tech',
    label: 'เทคโนโลยี (Tech & Audio)',
    iconNames: [
      'Cpu', 'Bot', 'Laptop', 'Monitor', 'Music', 'Headphones', 'Speaker',
      'Radio', 'Camera', 'Mic', 'Volume2', 'Wifi', 'BatteryCharging'
    ],
  },
  {
    id: 'nature',
    label: 'สัตว์ & ธรรมชาติ (Nature)',
    iconNames: [
      'Cat', 'Dog', 'Fish', 'Bird', 'Rabbit', 'TreePine', 'Flower2', 'Leaf',
      'Sun', 'Moon', 'Cloud', 'CloudRain', 'Flame'
    ],
  },
  {
    id: 'tools',
    label: 'สัญลักษณ์ & อุปกรณ์ (Symbols & Tools)',
    iconNames: [
      'Wrench', 'Hammer', 'Compass', 'Key', 'Lock', 'Bell', 'Check', 'AlertCircle',
      'HelpCircle', 'Coffee', 'Gift', 'Bookmark', 'Flag'
    ],
  },
];

export function getIconSvg(name: string, strokeColor = '#ffffff'): string | null {
  const iconData = (icons as Record<string, any>)[name];
  if (!iconData || !Array.isArray(iconData)) return null;

  const elements = iconData
    .map(([tag, attrs]: [string, Record<string, string>]) => {
      const attrStr = Object.entries(attrs)
        .map(([k, v]) => `${k}="${v}"`)
        .join(' ');
      // For 3D contouring, stroke-width 2.5 gives crisp embossed edges
      return `<${tag} ${attrStr} fill="none" stroke="${strokeColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="200" height="200" style="background:transparent">${elements}</svg>`;
}

export function searchIcons(query: string, limit = 40): string[] {
  const q = query.trim().toLowerCase();
  const allNames = Object.keys(icons).filter(
    (k) => typeof (icons as any)[k] === 'object' && Array.isArray((icons as any)[k])
  );
  if (!q) return allNames.slice(0, limit);
  return allNames.filter((name) => name.toLowerCase().includes(q)).slice(0, limit);
}
