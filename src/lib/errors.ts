export const appErrorCodes = [
  'VALIDATION_FAILED',
  'DATABASE_WRITE_FAILED',
  'OCR_FAILED',
  'OCR_TIMEOUT',
  'FILE_OPERATION_FAILED',
  'CLAIM_LOCKED',
  'CLAIM_CURRENCY_MISMATCH',
  'PDF_GENERATION_FAILED',
] as const;

export type AppErrorCode = (typeof appErrorCodes)[number];

export type UserFacingError = Readonly<{
  code: AppErrorCode;
  title: string;
  message: string;
}>;

const errorDefinitions: Record<AppErrorCode, Omit<UserFacingError, 'code'>> = {
  VALIDATION_FAILED: {
    title: 'Check your information',
    message: 'Some information is invalid. Review it and try again.',
  },
  DATABASE_WRITE_FAILED: {
    title: 'Changes not saved',
    message: "We couldn't save your changes. Try again.",
  },
  OCR_FAILED: {
    title: 'Receipt not recognized',
    message:
      "We couldn't read this receipt. Try another photo or enter the details manually.",
  },
  OCR_TIMEOUT: {
    title: 'Receipt scan timed out',
    message: 'The scan took too long. Try again or enter the details manually.',
  },
  FILE_OPERATION_FAILED: {
    title: 'File unavailable',
    message: "We couldn't access the file. Choose it again and retry.",
  },
  CLAIM_LOCKED: {
    title: 'Claim is locked',
    message: 'This claim can no longer be edited. Review its current status.',
  },
  CLAIM_CURRENCY_MISMATCH: {
    title: 'Different currency',
    message: 'This expense uses a different currency. Choose another expense.',
  },
  PDF_GENERATION_FAILED: {
    title: 'PDF not created',
    message: "We couldn't create the PDF. Check the claim and try again.",
  },
};

export function isAppErrorCode(value: unknown): value is AppErrorCode {
  return (
    typeof value === 'string' &&
    appErrorCodes.some((errorCode) => errorCode === value)
  );
}

function getErrorCode(error: unknown) {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return null;
  }

  return isAppErrorCode(error.code) ? error.code : null;
}

export function mapError(
  error: unknown,
  fallbackCode: AppErrorCode,
): UserFacingError {
  const code = getErrorCode(error) ?? fallbackCode;
  return { code, ...errorDefinitions[code] };
}
