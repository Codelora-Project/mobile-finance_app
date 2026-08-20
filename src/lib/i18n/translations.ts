import { en } from '@/lib/i18n/locales/en';
import { id } from '@/lib/i18n/locales/id';
import type {
  Language,
  TranslationSchema,
} from '@/lib/i18n/translation-schema';

export type {
  Language,
  TranslationSchema,
} from '@/lib/i18n/translation-schema';

export const translations = { en, id } satisfies Record<
  Language,
  TranslationSchema
>;
