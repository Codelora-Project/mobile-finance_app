import { recognizeText } from '@infinitered/react-native-mlkit-text-recognition';

export const OCR_TIMEOUT_MS = 20_000;

export type OcrResult = Readonly<{ rawText: string }>;
export type OcrFailureCode = 'OCR_FAILED' | 'OCR_TIMEOUT';

export class OcrError extends Error {
  constructor(readonly code: OcrFailureCode) {
    super(
      code === 'OCR_TIMEOUT' ? 'Receipt OCR timed out.' : 'Receipt OCR failed.',
    );
    this.name = 'OcrError';
  }
}

type Recognizer = (imagePath: string) => Promise<{ text: string }>;

export async function recognizeReceipt(
  imageUri: string,
  options: Readonly<{
    recognizer?: Recognizer;
    timeoutMs?: number;
  }> = {},
): Promise<OcrResult> {
  const recognizer = options.recognizer ?? recognizeText;
  const timeoutMs = options.timeoutMs ?? OCR_TIMEOUT_MS;
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    const result = await Promise.race([
      recognizer(imageUri),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new OcrError('OCR_TIMEOUT')),
          timeoutMs,
        );
      }),
    ]);
    const rawText = result.text.normalize('NFC').trim();
    if (!rawText) {
      throw new OcrError('OCR_FAILED');
    }
    return { rawText };
  } catch (error) {
    if (error instanceof OcrError) {
      throw error;
    }
    throw new OcrError('OCR_FAILED');
  } finally {
    if (timer) clearTimeout(timer);
  }
}
