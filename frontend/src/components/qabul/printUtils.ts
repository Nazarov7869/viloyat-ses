// Hujjatni (yo'llanma / chek) alohida oynada chop etish
export const printHtml = (title: string, html: string) => {
  const frame = document.createElement("iframe");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);

  const doc = frame.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(`<!doctype html><html lang="uz"><head><meta charset="utf-8" /><title>${title}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: ui-sans-serif, system-ui, "Segoe UI", Arial, sans-serif; color: #0f172a; margin: 24px; }
    h1 { font-size: 18px; margin: 0 0 4px; }
    h2 { font-size: 14px; margin: 16px 0 8px; }
    p, td, th, li { font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
    th { background: #f1f5f9; }
    .muted { color: #64748b; }
    .row { display: flex; justify-content: space-between; gap: 24px; }
    .box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin-top: 12px; }
    .total { font-size: 14px; font-weight: 700; }
  </style></head><body>${html}</body></html>`);
  doc.close();

  frame.contentWindow?.focus();
  setTimeout(() => {
    frame.contentWindow?.print();
    setTimeout(() => document.body.removeChild(frame), 1000);
  }, 250);
};