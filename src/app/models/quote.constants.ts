/**
 * Quote status constants and messages used throughout the application
 *
 *
 */

/**
 * Quote category constants (frontend/Quote model)
 */
export const QUOTE_CATEGORIES = {
  TAILORED: 'tailored',
  TENDER: 'tender',
  COORDINATOR: 'coordinator'
} as const;

export type QuoteCategoryType = typeof QUOTE_CATEGORIES[keyof typeof QUOTE_CATEGORIES];

/**
 * Quote status constants (stored in quote.quoteItem[0].state)
 */
export const QUOTE_STATUSES = {
  PENDING: 'pending',
  IN_PROGRESS: 'inProgress',
  APPROVED: 'approved',
  ACCEPTED: 'accepted',
  CANCELLED: 'cancelled',
  REJECTED: 'rejected'
} as const;

export type QuoteStatus = typeof QUOTE_STATUSES[keyof typeof QUOTE_STATUSES];

/**
 * Tender status constants (frontend display states)
 */
export const TAILORED_STATUSES_LABELS_CUSTOMER = {
  PENDING: 'request-sent-awaiting-feedback',
  IN_PROGRESS: 'request-accepted-and-being-worked-on',
  APPROVED: 'offering-submitted-by-provider',
  ACCEPTED: 'offering-accepted',
  CANCELLED: 'request-canceled',
  REJECTED: 'rejected'
} as const;

export type TailoredStatusesLabelsCustomer = typeof TAILORED_STATUSES_LABELS_CUSTOMER[keyof typeof TAILORED_STATUSES_LABELS_CUSTOMER];

/**
 * Tender status constants (frontend display states)
 */
export const TAILORED_STATUSES_LABELS_PROVIDER = {
  PENDING: 'request-received-pending-feedback',
  IN_PROGRESS: 'request-accepted',
  APPROVED: 'offering-submitted',
  ACCEPTED: 'offering-accepted-by-customer',
  CANCELLED: 'request-canceled',
  REJECTED: 'rejected'
} as const;

export type TailoredStatusesLabelsProvider = typeof TAILORED_STATUSES_LABELS_PROVIDER[keyof typeof TAILORED_STATUSES_LABELS_PROVIDER];

/** i18n key (TENDERS.STATUS.*) of a tender status label: coordinator tenders have their own
 * vocabulary; a provider's tendering quote reads differently to the buyer and to the provider. */
export function tenderStatusLabelKey(category: string | undefined, role: 'customer' | 'seller', state: string): string {
  const group = category === QUOTE_CATEGORIES.COORDINATOR ? 'COORDINATOR' : role === 'customer' ? 'CUSTOMER' : 'PROVIDER';
  return `TENDERS.STATUS.${group}.${state}`;
}

/** i18n keys (QUOTES._status.*) of the tailored status labels, by quote state, for the given view. */
export function tailoredStatusLabelKeys(role: 'customer' | 'seller'): Record<string, string> {
  const labels = role === 'customer' ? TAILORED_STATUSES_LABELS_CUSTOMER : TAILORED_STATUSES_LABELS_PROVIDER;
  return Object.fromEntries(Object.entries(labels)
    .map(([status, label]) => [QUOTE_STATUSES[status as keyof typeof QUOTE_STATUSES], `QUOTES._status.${label}`]));
}

/**
 * Auto-generated chat messages for status changes
 */
export const QUOTE_CHAT_MESSAGES = {
  STATUS_CHANGE: (status: string) => `Status changed to: ${status}`,
  ATTACHMENT_UPLOADED: (filename: string) => `Attachment uploaded: ${filename}`
};

