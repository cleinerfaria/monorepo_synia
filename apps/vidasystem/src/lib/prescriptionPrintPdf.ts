import { format } from 'date-fns';
import type {
  PrescriptionPrintOrientation,
  PrescriptionPrintSnapshot,
} from '@/types/prescriptionPrint';
import { buildPrescriptionWeekColumns } from '@/lib/prescriptionPrintUtils';
import { getProfessionalSignatureSignedUrl } from '@/lib/professionalSignatureStorage';

export type PrescriptionPrintOutputMode = 'print' | 'preview' | 'download';

interface OpenPrescriptionPrintPreviewOptions {
  mode?: PrescriptionPrintOutputMode;
  targetWindow?: Window | null;
  companyLogoUrl?: string | null;
  orientation?: PrescriptionPrintOrientation;
  prescriptionType?: string | null;
}

interface ResolvedWeekColumn {
  date: string;
  dayShortLabel: string;
  dayMonthLabel: string;
}

interface TableWidthConfig {
  num: number;
  med: number;
  via: number;
  freq: number;
  day: number;
}

interface HtmlContext {
  weekColumns: ResolvedWeekColumn[];
  rows: string;
  professionalIdentityLine: string;
  professionalSignatureUrl: string | null;
  companyLogoUrl: string | null;
  orientation: PrescriptionPrintOrientation;
  prescriptionHeaderTitle: string;
}

type PrescriptionTypeValue = 'medical' | 'nursing' | 'nutrition';

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeMultilineText(value: unknown): string {
  return escapeHtml(value).replace(/\n/g, '<br />');
}

function parseDateValue(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1, 12, 0, 0, 0);
}

function formatDateLabel(value: string): string {
  return format(parseDateValue(value), 'dd/MM/yyyy');
}

function resolveWeekColumns(snapshot: PrescriptionPrintSnapshot): ResolvedWeekColumn[] {
  const periodStart = parseDateValue(snapshot.period_start);
  const periodEnd = parseDateValue(snapshot.period_end);
  return buildPrescriptionWeekColumns(periodStart, periodEnd).map((column) => ({
    date: column.date,
    dayShortLabel: column.dayShortLabel,
    dayMonthLabel: column.dayMonthLabel,
  }));
}

function getGridValue(item: PrescriptionPrintSnapshot['items'][number], index: number): string {
  if (Array.isArray(item.grid_snapshot)) {
    return item.grid_snapshot[index]?.mark || '';
  }

  const legacyColumns = (item.grid_snapshot as any)?.columns;
  if (Array.isArray(legacyColumns)) {
    return legacyColumns[index]?.value || '';
  }

  return '';
}

function renderGridCell(value: string): string {
  if (value === '###HATCHED###') {
    return '<td class="day-cell day-cell-hatched"></td>';
  }
  return `<td class="day-cell">${escapeHtml(value)}</td>`;
}

function normalizePrescriptionType(value: unknown): PrescriptionTypeValue | null {
  const rawValue = String(value ?? '').trim();
  if (!rawValue) return null;

  const normalizedValue = rawValue
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_');

  if (
    normalizedValue === 'medical' ||
    normalizedValue === 'medica' ||
    normalizedValue === 'prescricao_mdedica'
  ) {
    return 'medical';
  }

  if (
    normalizedValue === 'nursing' ||
    normalizedValue === 'enfermagem' ||
    normalizedValue === 'prescricao_enfermagem' ||
    normalizedValue === 'prescricao_de_enfermagem'
  ) {
    return 'nursing';
  }

  if (
    normalizedValue === 'nutrition' ||
    normalizedValue === 'nutritional' ||
    normalizedValue === 'nutricional' ||
    normalizedValue === 'nutricao' ||
    normalizedValue === 'prescricao_nutricional'
  ) {
    return 'nutrition';
  }

  return null;
}

function resolvePrescriptionHeaderTitle(
  snapshot: PrescriptionPrintSnapshot,
  providedType?: string | null
): string {
  const resolvedType =
    normalizePrescriptionType(providedType) ??
    normalizePrescriptionType(snapshot.metadata_snapshot?.['prescription_type']) ??
    normalizePrescriptionType(snapshot.metadata_snapshot?.['prescriptionType']) ??
    normalizePrescriptionType(snapshot.metadata_snapshot?.['type']);

  switch (resolvedType) {
    case 'nursing':
      return 'PRESCRIÇÃO DE ENFERMAGEM';
    case 'nutrition':
      return 'PRESCRIÇÃO NUTRICIONAL';
    case 'medical':
    default:
      return 'PRESCRIÇÃO MÉDICA';
  }
}

function buildProfessionalIdentityLine(
  professionalName: string,
  professionalTitle: string,
  professionalCouncil: string
): string {
  return [professionalName, professionalTitle, professionalCouncil]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(' | ');
}

const PRINT_IMAGE_WAIT_TIMEOUT_MS = 6000;

function waitForImageToSettle(image: HTMLImageElement, timeoutMs: number): Promise<void> {
  if (image.complete) {
    if (typeof image.decode === 'function' && image.naturalWidth > 0) {
      return image.decode().catch(() => undefined);
    }
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let settled = false;
    let timeoutId: number | null = null;

    const finalize = () => {
      if (settled) return;
      settled = true;
      image.removeEventListener('load', finalize);
      image.removeEventListener('error', finalize);
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      resolve();
    };

    image.addEventListener('load', finalize, { once: true });
    image.addEventListener('error', finalize, { once: true });
    timeoutId = window.setTimeout(finalize, timeoutMs);
  });
}

async function waitForPrintableImages(targetWindow: Window): Promise<void> {
  const images = Array.from(targetWindow.document.images || []);
  if (images.length === 0) return;
  await Promise.all(
    images.map((image) => waitForImageToSettle(image, PRINT_IMAGE_WAIT_TIMEOUT_MS))
  );
}

function renderDocumentInWindow(targetWindow: Window, html: string, autoPrint: boolean): void {
  targetWindow.document.open();
  targetWindow.document.write(html);
  targetWindow.document.close();

  if (!autoPrint) {
    targetWindow.focus();
    return;
  }

  let hasPrinted = false;
  const printAction = async () => {
    if (hasPrinted) return;
    hasPrinted = true;
    await waitForPrintableImages(targetWindow);
    targetWindow.focus();
    targetWindow.print();
  };

  targetWindow.onload = () => {
    void printAction();
  };
  window.setTimeout(() => {
    void printAction();
  }, 300);
}

function renderPrintDocumentInIframe(html: string): boolean {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  const iframeWindow = iframe.contentWindow;
  if (!iframeWindow) {
    iframe.remove();
    return false;
  }

  let hasPrinted = false;
  const cleanup = () => {
    window.setTimeout(() => {
      iframe.remove();
    }, 1000);
  };
  const printAction = async () => {
    if (hasPrinted) return;
    hasPrinted = true;
    await waitForPrintableImages(iframeWindow);
    iframeWindow.focus();
    iframeWindow.print();
    cleanup();
  };

  iframeWindow.document.open();
  iframeWindow.document.write(html);
  iframeWindow.document.close();
  iframe.onload = () => {
    void printAction();
  };
  window.setTimeout(() => {
    void printAction();
  }, 300);
  return true;
}

function resolveCompanyLogoUrl(companyLogoUrl?: string | null): string | null {
  const normalizedLogoUrl = String(companyLogoUrl || '').trim();
  return normalizedLogoUrl || null;
}

function resolveOrientation(
  snapshot: PrescriptionPrintSnapshot,
  requestedOrientation?: PrescriptionPrintOrientation
): PrescriptionPrintOrientation {
  if (requestedOrientation === 'portrait' || requestedOrientation === 'landscape') {
    return requestedOrientation;
  }

  const snapshotOrientation = snapshot.metadata_snapshot?.page_orientation;
  if (snapshotOrientation === 'portrait' || snapshotOrientation === 'landscape') {
    return snapshotOrientation;
  }

  return 'landscape';
}

function resolveTableWidths(
  dayCount: number,
  orientation: PrescriptionPrintOrientation
): TableWidthConfig {
  const base =
    orientation === 'portrait'
      ? { num: 4.5, med: 31.5, via: 7.5, freq: 8.5 }
      : { num: 3.5, med: 41.5, via: 6.5, freq: 7.0 };

  const remaining = 100 - base.num - base.med - base.via - base.freq;
  const safeDayCount = Math.max(1, dayCount);

  return {
    ...base,
    day: remaining / safeDayCount,
  };
}

function buildPrintHtml(snapshot: PrescriptionPrintSnapshot, context: HtmlContext): string {
  const widths = resolveTableWidths(context.weekColumns.length, context.orientation);
  const dayCellFontSize = context.weekColumns.length > 10 ? 8 : 10;
  const pageTitleSize = context.orientation === 'portrait' ? 14 : 16;

  return `
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>Prescrição ${escapeHtml(snapshot.print_number)}</title>
    <style>
      @page {
        size: A4 ${context.orientation};
        margin: 6mm;
      }
      body {
        margin: 0;
        font-family: Arial, sans-serif;
        color: #111827;
        font-size: 11px;
      }
      .sheet {
        width: 100%;
        padding-right: 5px;
        box-sizing: border-box;
      }
      .header {
        padding: 4px 0;
      }
      .header-top {
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: center;
        gap: 8px;
      }
      .brand {
        display: flex;
        align-items: center;
      }
      .brand-logo {
        width: 136px;
        height: auto;
        display: block;
      }
      .brand-logo-fallback {
        width: 136px;
        height: 1px;
      }
      .title {
        text-align: center;
        font-weight: 700;
        font-size: ${pageTitleSize}px;
        letter-spacing: 0.4px;
      }
      .number {
        font-weight: 700;
        border: 1px solid #111827;
        padding: 4px 8px;
        white-space: nowrap;
      }
      .meta-grid {
        margin-top: 0px;
        display: grid;
        grid-template-columns: minmax(0, 1.9fr) minmax(0, 1.1fr) 132px 116px;
        gap: 3px 8px;
        padding-right: 8px;
        box-sizing: border-box;
      }
      .meta-item {
        border-bottom: none;
        min-height: 14px;
      }
      .meta-item-fixed {
        white-space: nowrap;
      }
      .meta-label {
        font-weight: 700;
      }
      table {
        margin-top: 0px;
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        table-layout: fixed;
        border: 1px solid #111827;
      }
      th, td {
        border: 0;
        padding: 4px 3px;
        vertical-align: top;
        word-break: break-word;
      }
      th {
        text-align: center;
        font-size: ${context.weekColumns.length > 10 ? 9 : 10}px;
      }
      thead th {
        border-right: 0.6px solid #111827;
        border-bottom: 1px solid #111827;
      }
      tbody td {
        border-right: 0.6px solid #111827;
      }
      thead th:last-child,
      tbody td:last-child {
        border-right: 0;
      }
      tbody tr:nth-child(even) td {
        background-color: #cccccc;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .num-cell {
        width: ${widths.num}%;
        text-align: center;
        font-weight: 700;
      }
      .med-cell {
        width: ${widths.med}%;
      }
      .via-cell {
        width: ${widths.via}%;
        text-align: center;
      }
      .freq-cell {
        width: ${widths.freq}%;
        text-align: center;
      }
      .day-cell {
        width: ${widths.day}%;
        text-align: center;
        font-family: "Consolas", "Courier New", monospace;
        font-size: ${dayCellFontSize}px;
        line-height: 1.25;
        font-weight: 700;
      }
      .day-cell-hatched {
        background-image: repeating-linear-gradient(
          135deg,
          #ffffff 0px,
          #ffffff 2px,
          #aaaaaa 2px,
          #aaaaaa 4px
        );
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .signature {
        margin-top: 0px;
        display: flex;
        justify-content: flex-end;
      }
      .signature-box {
        width: 290px;
        text-align: center;
      }
      .signature-image {
        max-width: 220px;
        max-height: 88px;
        width: auto;
        height: auto;
        margin: 0 auto 0px;
        display: block;
      }
      .signature-blank {
        min-height: 36px;
        display: block;
      }
      .signature-line {
        margin-top: 0px;
        border-top: 1px solid #111827;
      }
      .signature-professional-line {
        margin-top: 6px;
        font-weight: 700;
      }
      @media print {
        .sheet {
          page-break-after: auto;
        }
        .day-cell {
          color: #000;
          font-weight: 700;
        }
        .day-cell-hatched {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    </style>
  </head>
  <body>
    <div class="sheet">
      <div class="header">
        <div class="header-top">
          <div class="brand">
            ${
              context.companyLogoUrl
                ? `<img class="brand-logo" src="${escapeHtml(context.companyLogoUrl)}" alt="Logomarca da empresa" loading="eager" />`
                : '<div class="brand-logo-fallback"></div>'
            }
          </div>
          <div class="title">${escapeHtml(context.prescriptionHeaderTitle)}</div>
          <div class="number">N&ordm;: ${escapeHtml(snapshot.print_number)}</div>
        </div>
        <div class="meta-grid">
          <div class="meta-item"><span class="meta-label">Paciente:</span> ${escapeHtml(snapshot.patient_snapshot?.name || '')}</div>
          <div class="meta-item"><span class="meta-label">Operadora:</span> ${escapeHtml(snapshot.patient_snapshot?.operadora || '')}</div>
          <div class="meta-item meta-item-fixed"><span class="meta-label">Data Nasc.:</span> ${escapeHtml(
            snapshot.patient_snapshot?.birth_date
              ? formatDateLabel(snapshot.patient_snapshot.birth_date)
              : 'Nao informado'
          )}</div>
          <div class="meta-item meta-item-fixed"><span class="meta-label">Idade:</span> ${escapeHtml(snapshot.patient_snapshot?.age_label || '')}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 15px;">#</th>
            <th style="width: ${widths.med}%;">ITEM</th>
            <th style="width: 28px;">VIA</th>
            <th style="width: 34px;">FREQ.</th>
            ${context.weekColumns
              .map(
                (column) =>
                  `<th style="width: ${widths.day}%;">${escapeHtml(column.dayShortLabel.toLowerCase())}<br />${escapeHtml(column.dayMonthLabel)}</th>`
              )
              .join('')}
          </tr>
        </thead>
        <tbody>
          ${context.rows}
        </tbody>
      </table>

      <div class="signature">
        <div class="signature-box">
            ${
              context.professionalSignatureUrl
                ? `<img class="signature-image" src="${escapeHtml(context.professionalSignatureUrl)}" alt="Assinatura do profissional" loading="eager" />`
                : '<div class="signature-blank"></div>'
            }
          <div class="signature-line"></div>
          <div class="signature-professional-line">${escapeHtml(context.professionalIdentityLine)}</div>
        </div>
      </div>
    </div>
  </body>
</html>
`;
}

async function resolveProfessionalSignatureUrl(
  snapshot: PrescriptionPrintSnapshot
): Promise<string | null> {
  const signaturePath = snapshot.metadata_snapshot?.professional_signature_path;
  if (!signaturePath || typeof signaturePath !== 'string') {
    return null;
  }

  try {
    return await getProfessionalSignatureSignedUrl(signaturePath);
  } catch (error) {
    console.error('Erro ao criar assinatura do profissional:', error);
    return null;
  }
}

export async function openPrescriptionPrintPreview(
  snapshot: PrescriptionPrintSnapshot,
  options?: OpenPrescriptionPrintPreviewOptions
): Promise<void> {
  const mode = options?.mode || 'print';
  const orientation = resolveOrientation(snapshot, options?.orientation);
  const targetWindow =
    mode !== 'download'
      ? (options?.targetWindow ?? window.open('', '_blank', 'width=1240,height=900'))
      : null;

  const weekColumns = resolveWeekColumns(snapshot);
  const rows = snapshot.items
    .slice()
    .sort((a, b) => a.order_index - b.order_index)
    .map((item) => {
      const gridCells = weekColumns
        .map((_column, index) => renderGridCell(getGridValue(item, index)))
        .join('');

      return `
        <tr>
          <td class="num-cell">${escapeHtml(item.order_index)}</td>
          <td class="med-cell">${escapeMultilineText(item.description_snapshot)}</td>
          <td class="via-cell">${escapeHtml(item.route_snapshot || '')}</td>
          <td class="freq-cell">${escapeHtml(item.frequency_snapshot || '')}</td>
          ${gridCells}
        </tr>
      `;
    })
    .join('');

  const professionalName = snapshot.metadata_snapshot?.professional_name || '';
  const professionalTitle = snapshot.metadata_snapshot?.professional_title || '';
  const professionalCouncil = snapshot.metadata_snapshot?.professional_council || '';
  const professionalIdentityLine = buildProfessionalIdentityLine(
    professionalName,
    professionalTitle,
    professionalCouncil
  );
  const professionalSignatureUrl = await resolveProfessionalSignatureUrl(snapshot);
  const companyLogoUrl = resolveCompanyLogoUrl(options?.companyLogoUrl);
  const prescriptionHeaderTitle = resolvePrescriptionHeaderTitle(
    snapshot,
    options?.prescriptionType
  );

  const html = buildPrintHtml(snapshot, {
    weekColumns,
    rows,
    professionalIdentityLine,
    professionalSignatureUrl,
    companyLogoUrl,
    orientation,
    prescriptionHeaderTitle,
  });
  // Keep visual parity: download reuses the exact same HTML/CSS print layout.
  const shouldAutoPrint = mode === 'print' || mode === 'download';

  if (targetWindow) {
    renderDocumentInWindow(targetWindow, html, shouldAutoPrint);
    return;
  }

  if (mode === 'preview') {
    throw new Error('Nao foi possivel abrir a visualização da prescrição.');
  }

  if (renderPrintDocumentInIframe(html)) {
    return;
  }

  if (mode === 'download') {
    throw new Error('Não foi possível abrir o dialogo para salvar o PDF.');
  }

  throw new Error('Não foi possível abrir a janela de impressão.');
}
