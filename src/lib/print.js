export function openPrint(path) {
  const w = window.open(path, '_blank', 'noopener,noreferrer');
  if (!w) window.location.assign(path);
}

export function applyPrintPage(paper) {
  document.body.classList.add('is-print-page');
  document.body.classList.toggle('print-thermal', paper === 'thermal');
  document.body.classList.toggle('print-a4', paper !== 'thermal');
  let el = document.getElementById('ayzal-page-rule');
  if (!el) {
    el = document.createElement('style');
    el.id = 'ayzal-page-rule';
    document.head.appendChild(el);
  }
  el.textContent = paper === 'thermal'
    ? '@media print { @page { size: 80mm auto; margin: 3mm 2.5mm; } }'
    : '@media print { @page { size: A4 portrait; margin: 12mm 12mm 14mm 12mm; } }';
}

export function clearPrintPage() {
  document.body.classList.remove('is-print-page', 'print-thermal', 'print-a4');
  const el = document.getElementById('ayzal-page-rule');
  if (el) el.remove();
}
