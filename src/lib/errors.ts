export const appErrorCodes = [
  'VALIDATION_FAILED',
  'DATABASE_WRITE_FAILED',
  'DATABASE_BUSY',
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

export type CodedError = Error & { code: AppErrorCode };

type LocalizedErrorDefinitions = Readonly<
  Record<AppErrorCode, Readonly<{ message: string; title: string }>>
>;

const errorDefinitions: Record<AppErrorCode, Omit<UserFacingError, 'code'>> = {
  VALIDATION_FAILED: {
    title: 'Check your information',
    message: 'Some information is invalid. Review it and try again.',
  },
  DATABASE_WRITE_FAILED: {
    title: 'Changes not saved',
    message: "We couldn't save your changes. Try again.",
  },
  DATABASE_BUSY: {
    title: 'Database busy',
    message: 'The database is busy. Try again in a moment.',
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

export function createCodedError(
  code: AppErrorCode,
  message: string,
): CodedError {
  return Object.assign(new Error(message), { code });
}

export function isCodedError(error: unknown): error is CodedError {
  return (
    error instanceof Error && 'code' in error && isAppErrorCode(error.code)
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
  localizedDefinitions?: LocalizedErrorDefinitions,
): UserFacingError {
  const code = getErrorCode(error) ?? fallbackCode;
  return {
    code,
    ...(localizedDefinitions?.[code] ?? errorDefinitions[code]),
  };
}
