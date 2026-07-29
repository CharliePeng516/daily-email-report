import { gmailProvider } from './gmail/index.js';
import { outlookProvider } from './outlook/index.js';
import type { MailProvider, ProviderName } from './types.js';

export function getProvider(name: ProviderName): MailProvider {
  switch (name) {
    case 'outlook':
      return outlookProvider;
    case 'gmail':
      return gmailProvider;
  }
}

export type { FetchedItem, MailProvider, ProviderName } from './types.js';
