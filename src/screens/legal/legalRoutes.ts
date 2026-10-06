/**
 * Маршруты экранов «Документы» (стек вкладки «Аккаунт», src/navigation/authStack.tsx).
 * Навигация в приложении нетипизированная (createNativeStackNavigator без ParamList),
 * поэтому типы параметров объявлены здесь и используются экранами через useRoute.
 */
import type {LegalDocSlug} from '../../content/legalDocs';

/** Список документов (src/content/legalDocs.ts). */
export const LEGAL_DOCUMENTS_ROUTE = 'legalDocuments';
/** Один документ (HTML из CMS). */
export const LEGAL_DOCUMENT_ROUTE = 'legalDocument';
/** Старый маршрут политики: теперь открывает документ privacy-policy (тот же экран). */
export const PRIVACY_POLICY_ROUTE = 'privacyPolicy';

export type LegalDocumentParams = {
  slug: LegalDocSlug;
  /** Заголовок до загрузки (название из списка). */
  title?: string;
};

export type LegalStackParamList = {
  [LEGAL_DOCUMENTS_ROUTE]: undefined;
  [LEGAL_DOCUMENT_ROUTE]: LegalDocumentParams;
  [PRIVACY_POLICY_ROUTE]: LegalDocumentParams | undefined;
};
