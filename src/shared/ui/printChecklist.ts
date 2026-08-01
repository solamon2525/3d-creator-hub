/** Interactive print checklist in the studio panel (orientation / AMS / pause). */

export type StudioId = 'keycap' | 'clicker' | 'mascot';

export type PrintChecklistContext = {
  studio: StudioId;
  colorMode?: 'ams' | 'zband';
  unit?: number;
  stabilizer?: boolean;
  keychain?: boolean;
  mascotTab?: 'relief' | 'avatar';
  partCount?: number;
};

type Item = {
  id: string;
  label: string;
  /** Hide unless predicate is true (default: always). */
  when?: (ctx: PrintChecklistContext) => boolean;
};

const ITEMS: Record<StudioId, Item[]> = {
  keycap: [
    {
      id: 'orient',
      label: 'ทิศ: พิมพ์คว่ำหน้า (legend ลง bed) — มักไม่ต้อง support',
    },
    {
      id: 'scale',
      label: 'เช็กขนาดใน slicer (~18 mm สำหรับ 1u · 1 unit = 1 mm)',
    },
    {
      id: 'ams',
      label: 'AMS: กำหนดเส้น body + legend ใน 3MF (หรือ STL สีเดียว)',
    },
    {
      id: 'stem',
      label: 'ลองใส่สวิตช์ MX — ถ้าฝืดให้เพิ่ม Stem tol',
    },
    {
      id: 'stab',
      label: '2u+: ตรวจ dual stem + ช่อง stabilizer (±11.9 mm)',
      when: (c) => (c.unit ?? 1) >= 2 && !!c.stabilizer,
    },
    {
      id: 'export',
      label: 'Export 3MF + Cover แล้วเปิดใน slicer',
    },
  ],
  clicker: [
    {
      id: 'orient',
      label: 'ทิศ: พิมพ์ตั้ง (ฝาขึ้น) · bezel มักไม่ต้อง support',
    },
    {
      id: 'ams',
      label: 'AMS: หลายสีในไฟล์ 3MF เดียว — แม็ปเส้นตามชิ้นส่วน',
      when: (c) => (c.colorMode ?? 'ams') === 'ams',
    },
    {
      id: 'zband',
      label: 'No-AMS: ใส่ pause ใน slicer ตอนเปลี่ยนชั้นสี (Z-band)',
      when: (c) => c.colorMode === 'zband',
    },
    {
      id: 'socket',
      label: 'MX socket อยู่ก้น body — ทดสอบกับสวิตช์จริง',
    },
    {
      id: 'image',
      label: 'ถ้าใช้รูป: คอนทราสต์สูง · สี 2–4 · ลอง knock-out พื้นขาว',
    },
    {
      id: 'keychain',
      label: 'พวงกุญแจ: ตรวจห่วง/รูบนขอบฐาน',
      when: (c) => !!c.keychain,
    },
    {
      id: 'export',
      label: 'Export 3MF + Cover แล้วเปิดใน slicer',
    },
  ],
  mascot: [
    {
      id: 'orient',
      label: 'Relief: พิมพ์ฐานวางราบบน bed',
      when: (c) => (c.mascotTab ?? 'relief') === 'relief',
    },
    {
      id: 'ams',
      label: 'AMS: แยกสีชั้นนูนใน 3MF ตามชิ้นส่วน',
      when: (c) => (c.mascotTab ?? 'relief') === 'relief',
    },
    {
      id: 'keychain',
      label: 'พวงกุญแจ: ตรวจห่วงติดฐาน',
      when: (c) => (c.mascotTab ?? 'relief') === 'relief' && !!c.keychain,
    },
    {
      id: 'avatar-glb',
      label: 'Avatar: Export GLB สำหรับใช้ดิจิทัล',
      when: (c) => c.mascotTab === 'avatar',
    },
    {
      id: 'avatar-stl',
      label: 'Avatar: ถ้าจะพิมพ์ ใช้ STL แยกชิ้น + จัดทิศใน slicer',
      when: (c) => c.mascotTab === 'avatar',
    },
    {
      id: 'export',
      label: 'Export ไฟล์แล้วเปิดตรวจใน slicer / โปรแกรม 3D',
    },
  ],
};

function storageKey(studio: StudioId): string {
  return `3dch-print-checklist-${studio}`;
}

function loadChecked(studio: StudioId): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey(studio));
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveChecked(studio: StudioId, ids: Set<string>): void {
  localStorage.setItem(storageKey(studio), JSON.stringify([...ids]));
}

/** Static shell — call mountPrintChecklist after mountShell. */
export function printChecklistHtml(studio: StudioId): string {
  return `
  <details class="tips checklist" id="printChecklist" open data-studio="${studio}">
    <summary>Checklist พิมพ์ <span class="check-progress" id="checkProgress">—</span></summary>
    <ul class="check-list" id="checkList"></ul>
    <p class="check-hint" id="checkHint"></p>
  </details>`;
}

export type PrintChecklistApi = {
  refresh: (ctx: PrintChecklistContext) => void;
};

export function mountPrintChecklist(
  getContext: () => PrintChecklistContext,
): PrintChecklistApi | null {
  const root = document.querySelector<HTMLElement>('#printChecklist');
  const list = document.querySelector<HTMLUListElement>('#checkList');
  const progress = document.querySelector<HTMLElement>('#checkProgress');
  const hint = document.querySelector<HTMLElement>('#checkHint');
  if (!root || !list || !progress || !hint) return null;

  const studio = (root.dataset.studio as StudioId) || getContext().studio;
  let checked = loadChecked(studio);

  const updateProgress = (visible: Item[]) => {
    const done = visible.filter((i) => checked.has(i.id)).length;
    progress.textContent = `${done}/${visible.length}`;
    root.dataset.complete = done === visible.length && visible.length > 0 ? '1' : '0';
  };

  const refresh = (ctx: PrintChecklistContext) => {
    const items = ITEMS[ctx.studio].filter((i) => !i.when || i.when(ctx));
    list.innerHTML = items
      .map((i) => {
        const on = checked.has(i.id) ? 'checked' : '';
        return `<li data-id="${i.id}"><label><input type="checkbox" data-check-id="${i.id}" ${on}/> ${i.label}</label></li>`;
      })
      .join('');

    if (ctx.studio === 'clicker' && ctx.colorMode === 'zband') {
      hint.textContent =
        'Z-band: ใน Bambu/Prusa slicer ใส่ Pause ที่ความสูงเปลี่ยนสีแต่ละชั้น';
    } else if (ctx.studio === 'clicker' && ctx.colorMode === 'ams') {
      hint.textContent = ctx.partCount
        ? `ไฟล์นี้มี ~${ctx.partCount} ส่วนสี — แม็ปเส้น AMS ให้ครบ`
        : 'แม็ปเส้น AMS ตามชิ้นส่วนใน 3MF';
    } else if (ctx.studio === 'keycap') {
      hint.textContent = 'Cover PNG แนบตอน export ช่วยจำสี/ทิศตอนจัดคิวพิมพ์';
    } else {
      hint.textContent = 'ติ๊กทีละข้อก่อนกดพิมพ์จริง — สถานะถูกจำในเบราว์เซอร์นี้';
    }

    updateProgress(items);
  };

  list.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement | null;
    if (!t || t.type !== 'checkbox' || !t.dataset.checkId) return;
    if (t.checked) checked.add(t.dataset.checkId);
    else checked.delete(t.dataset.checkId);
    saveChecked(studio, checked);
    refresh(getContext());
  });

  refresh(getContext());
  return { refresh };
}

/** @deprecated Use printChecklistHtml — kept as aliases for older imports. */
export const PRINT_TIPS_KEYCAP = printChecklistHtml('keycap');
export const PRINT_TIPS_CLICKER = printChecklistHtml('clicker');
export const PRINT_TIPS_MASCOT = printChecklistHtml('mascot');
