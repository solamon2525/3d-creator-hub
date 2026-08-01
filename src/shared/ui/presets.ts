/** Shared UI snippets for studios. */
export {
  printChecklistHtml,
  mountPrintChecklist,
  PRINT_TIPS_KEYCAP,
  PRINT_TIPS_CLICKER,
  PRINT_TIPS_MASCOT,
  type PrintChecklistApi,
  type PrintChecklistContext,
  type StudioId,
} from './printChecklist';

export const IMAGE_WIZARD_HINT = `
  <div class="wizard" id="imageWizard">
    <strong>Image wizard</strong>
    <ol>
      <li>อัปโหลดรูป / SVG</li>
      <li>ปรับ crop · knock-out พื้นขาว · จำนวนสี</li>
      <li>ดูพรีวิว quantize + สีด้านล่าง</li>
      <li>Export 3MF (AMS) หรือ No-AMS Z-band</li>
    </ol>
    <div id="paletteSwatches" class="preset-row" style="margin-top:0.5rem"></div>
    <img id="wizardPreview" alt="" class="wizard-preview hidden"/>
  </div>`;
