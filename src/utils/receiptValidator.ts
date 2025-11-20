import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import { createWorker, Worker } from 'tesseract.js';

let workerPromise: Promise<Worker> | null = null;


export async function saveBase64ToTempFile(base64: string, ext: string): Promise<string> {
  const tempDir = path.join(os.tmpdir(), 'splity-ocr');
  await fs.mkdir(tempDir, { recursive: true });

  const fileName = `ocr_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const fullPath = path.join(tempDir, fileName);

  const buffer = Buffer.from(base64, 'base64');
  await fs.writeFile(fullPath, buffer);

  return fullPath;
}

async function getWorker(): Promise<Worker> {
  // La PRIMER vez creo el worker
  if (!workerPromise) {
    // createWorker('spa') devuelve Promise<Worker>
    workerPromise = createWorker('spa'); // 'spa' = español. Podés usar 'spa+eng'
  }
  // Después reutilizo la misma promesa
  return workerPromise;
}

export async function runOcrOnImage(imagePath: string): Promise<string> {
  const worker = await getWorker();
  const { data } = await worker.recognize(imagePath);
  return data.text;
}


export type ReceiptValidationResult = {
  valido: boolean;
  razon?: string;
  posiblesImportes?: string[];
  score: number;
};

export function validarComprobantePorOcr(ocrText: string): ReceiptValidationResult {
  const raw = ocrText || '';
  // bajar a minúsculas y sacar tildes para simplificar búsquedas
  const text = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');

  let score = 0;

  // 1) ¿Hay suficiente texto?
  if (text.length >= 40) {
    score += 1;
  } else {
    return {
      valido: false,
      razon: 'La imagen casi no contiene texto legible.',
      posiblesImportes: [],
      score,
    };
  }

  // 2) Palabras clave de "es un comprobante / pago"
  const palabrasPago = [
    'comprobante',
    'transferencia',
    'pago',
    'recibo',
    'boleta',
    'factura',
    'ticket',
  ];
  if (palabrasPago.some(k => text.includes(k))) {
    score += 2;
  }

  // 3) Palabras de dinero (aunque no encontremos el número exacto)
  const palabrasDinero = ['total', 'importe', 'monto', '$', 'ars'];
  if (palabrasDinero.some(k => text.includes(k))) {
    score += 1;
  }

  // 4) Números con pinta de importe
  const regexImporte = /\b\d{1,3}(\.\d{3})*(,\d{2})\b|\b\d+\.\d{2}\b/g;
  const importes = text.match(regexImporte) || [];
  if (importes.length > 0) {
    score += 2;
  }

  // 5) Datos bancarios / identificadores típicos
  const datosBancarios = [
    'cuit',
    'cuil',
    'cbu',
    'cvu',
    'alias',
    'numero de operacion',
    'número de operacion',
    'numero de operacion de mercado pago',
  ];
  if (datosBancarios.some(k => text.includes(k))) {
    score += 2;
  }

  // 6) Caso fuerte específico para Mercado Pago
  const esMercadoPago =
    text.includes('mercado pago') &&
    (text.includes('comprobante de transferencia') ||
      text.includes('comprobante de pago'));

  if (esMercadoPago) {
    score += 2;
  }

  // 7) Decisión final
  const valido = score >= 4; // puedes subir/bajar este umbral según veas falsos positivos

  return {
    valido,
    razon: valido ? undefined : 'El texto no se parece lo suficiente a un comprobante.',
    posiblesImportes: importes,
    score,
  };
}