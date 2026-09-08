export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  let tray = document.querySelector<HTMLElement>('#downloadFiles');
  if (!tray) {
    tray = document.createElement('aside');
    tray.id = 'downloadFiles';
    tray.setAttribute('aria-label', 'ไฟล์พร้อมดาวน์โหลด');
    const title = document.createElement('strong');
    title.textContent = 'ไฟล์พร้อมดาวน์โหลด';
    tray.appendChild(title);
    const close = document.createElement('button');
    close.textContent = 'ปิด';
    close.onclick = () => {
      tray!.querySelectorAll('a').forEach(link => URL.revokeObjectURL(link.href));
      tray!.remove();
    };
    tray.appendChild(close);
    document.body.appendChild(tray);
  }
  // Keep explicit links available when a browser blocks multiple automatic downloads.
  for (const old of Array.from(tray.querySelectorAll('a'))) {
    if (old.download === filename) { URL.revokeObjectURL(old.href); old.remove(); }
  }
  while (tray.querySelectorAll('a').length >= 6) {
    const old = tray.querySelector('a')!; URL.revokeObjectURL(old.href); old.remove();
  }
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.textContent = filename;
  tray.appendChild(a);
  a.click();
}
