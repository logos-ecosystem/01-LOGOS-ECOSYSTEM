import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import fs from 'fs/promises';
import path from 'path';

interface Translation {
  [key: string]: string | Translation;
}

interface LanguageConfig {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  dateFormat: string;
  numberFormat: {
    decimal: string;
    thousands: string;
    currency: string;
  };
  currency: {
    code: string;
    symbol: string;
    position: 'before' | 'after';
  };
}

export class I18nService {
  private translations: Map<string, Translation> = new Map();
  private languages: Map<string, LanguageConfig> = new Map();
  private defaultLanguage = 'en';

  constructor() {
    this.initializeLanguages();
    this.loadTranslations();
  }

  private initializeLanguages() {
    const languages: LanguageConfig[] = [
      {
        code: 'en',
        name: 'English',
        nativeName: 'English',
        flag: '🇺🇸',
        dateFormat: 'MM/DD/YYYY',
        numberFormat: {
          decimal: '.',
          thousands: ',',
          currency: '$'
        },
        currency: {
          code: 'USD',
          symbol: '$',
          position: 'before'
        }
      },
      {
        code: 'es',
        name: 'Spanish',
        nativeName: 'Español',
        flag: '🇪🇸',
        dateFormat: 'DD/MM/YYYY',
        numberFormat: {
          decimal: ',',
          thousands: '.',
          currency: '€'
        },
        currency: {
          code: 'EUR',
          symbol: '€',
          position: 'after'
        }
      },
      {
        code: 'fr',
        name: 'French',
        nativeName: 'Français',
        flag: '🇫🇷',
        dateFormat: 'DD/MM/YYYY',
        numberFormat: {
          decimal: ',',
          thousands: ' ',
          currency: '€'
        },
        currency: {
          code: 'EUR',
          symbol: '€',
          position: 'after'
        }
      },
      {
        code: 'de',
        name: 'German',
        nativeName: 'Deutsch',
        flag: '🇩🇪',
        dateFormat: 'DD.MM.YYYY',
        numberFormat: {
          decimal: ',',
          thousands: '.',
          currency: '€'
        },
        currency: {
          code: 'EUR',
          symbol: '€',
          position: 'after'
        }
      },
      {
        code: 'pt',
        name: 'Portuguese',
        nativeName: 'Português',
        flag: '🇧🇷',
        dateFormat: 'DD/MM/YYYY',
        numberFormat: {
          decimal: ',',
          thousands: '.',
          currency: 'R$'
        },
        currency: {
          code: 'BRL',
          symbol: 'R$',
          position: 'before'
        }
      },
      {
        code: 'it',
        name: 'Italian',
        nativeName: 'Italiano',
        flag: '🇮🇹',
        dateFormat: 'DD/MM/YYYY',
        numberFormat: {
          decimal: ',',
          thousands: '.',
          currency: '€'
        },
        currency: {
          code: 'EUR',
          symbol: '€',
          position: 'before'
        }
      },
      {
        code: 'ja',
        name: 'Japanese',
        nativeName: '日本語',
        flag: '🇯🇵',
        dateFormat: 'YYYY/MM/DD',
        numberFormat: {
          decimal: '.',
          thousands: ',',
          currency: '¥'
        },
        currency: {
          code: 'JPY',
          symbol: '¥',
          position: 'before'
        }
      },
      {
        code: 'zh',
        name: 'Chinese',
        nativeName: '中文',
        flag: '🇨🇳',
        dateFormat: 'YYYY-MM-DD',
        numberFormat: {
          decimal: '.',
          thousands: ',',
          currency: '¥'
        },
        currency: {
          code: 'CNY',
          symbol: '¥',
          position: 'before'
        }
      }
    ];

    languages.forEach(lang => {
      this.languages.set(lang.code, lang);
    });
  }

  private async loadTranslations() {
    try {
      const translationsDir = path.join(__dirname, '../../translations');
      const files = await fs.readdir(translationsDir);

      for (const file of files) {
        if (file.endsWith('.json')) {
          const langCode = file.replace('.json', '');
          const content = await fs.readFile(
            path.join(translationsDir, file),
            'utf-8'
          );
          this.translations.set(langCode, JSON.parse(content));
        }
      }
    } catch (error) {
      logger.error('Error loading translations:', error);
    }
  }

  // Get translation for a key
  translate(key: string, language: string = this.defaultLanguage, params?: any): string {
    const translation = this.getNestedTranslation(
      this.translations.get(language) || this.translations.get(this.defaultLanguage) || {},
      key
    );

    if (!translation) {
      logger.warn(`Translation missing for key: ${key} in language: ${language}`);
      return key;
    }

    // Replace parameters
    if (params) {
      return this.replacePlaceholders(translation, params);
    }

    return translation;
  }

  private getNestedTranslation(obj: Translation, path: string): string {
    const keys = path.split('.');
    let current: any = obj;

    for (const key of keys) {
      if (current[key] === undefined) {
        return '';
      }
      current = current[key];
    }

    return typeof current === 'string' ? current : '';
  }

  private replacePlaceholders(text: string, params: any): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return params[key] !== undefined ? params[key] : match;
    });
  }

  // Format date according to language
  formatDate(date: Date | string, language: string = this.defaultLanguage): string {
    const langConfig = this.languages.get(language) || this.languages.get(this.defaultLanguage)!;
    const d = new Date(date);

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return langConfig.dateFormat
      .replace('DD', day)
      .replace('MM', month)
      .replace('YYYY', String(year));
  }

  // Format number according to language
  formatNumber(
    number: number,
    language: string = this.defaultLanguage,
    decimals: number = 2
  ): string {
    const langConfig = this.languages.get(language) || this.languages.get(this.defaultLanguage)!;
    
    const parts = number.toFixed(decimals).split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, langConfig.numberFormat.thousands);
    
    return decimals > 0
      ? `${integerPart}${langConfig.numberFormat.decimal}${parts[1]}`
      : integerPart;
  }

  // Format currency according to language
  formatCurrency(
    amount: number,
    language: string = this.defaultLanguage,
    currencyCode?: string
  ): string {
    const langConfig = this.languages.get(language) || this.languages.get(this.defaultLanguage)!;
    const formattedNumber = this.formatNumber(amount, language, 2);
    const symbol = currencyCode || langConfig.currency.symbol;

    return langConfig.currency.position === 'before'
      ? `${symbol}${formattedNumber}`
      : `${formattedNumber} ${symbol}`;
  }

  // Get available languages
  getLanguages(): LanguageConfig[] {
    return Array.from(this.languages.values());
  }

  // Get language config
  getLanguageConfig(language: string): LanguageConfig | undefined {
    return this.languages.get(language);
  }

  // Generate translated invoice
  async generateTranslatedInvoice(invoice: any, language: string): Promise<any> {
    const t = (key: string, params?: any) => this.translate(key, language, params);

    return {
      ...invoice,
      labels: {
        invoice: t('invoice.title'),
        invoiceNumber: t('invoice.number'),
        issueDate: t('invoice.issueDate'),
        dueDate: t('invoice.dueDate'),
        billTo: t('invoice.billTo'),
        paymentTerms: t('invoice.paymentTerms'),
        description: t('invoice.description'),
        quantity: t('invoice.quantity'),
        unitPrice: t('invoice.unitPrice'),
        amount: t('invoice.amount'),
        subtotal: t('invoice.subtotal'),
        discount: t('invoice.discount'),
        tax: t('invoice.tax'),
        total: t('invoice.total'),
        notes: t('invoice.notes'),
        paymentInstructions: t('invoice.paymentInstructions'),
        thankYou: t('invoice.thankYou'),
        overdue: t('invoice.overdue'),
        paid: t('invoice.paid'),
        pending: t('invoice.pending'),
        partial: t('invoice.partial')
      },
      formatted: {
        issueDate: this.formatDate(invoice.issueDate, language),
        dueDate: this.formatDate(invoice.dueDate, language),
        subtotal: this.formatCurrency(invoice.subtotal, language),
        discount: invoice.discount > 0 ? this.formatCurrency(invoice.discount, language) : null,
        tax: invoice.tax > 0 ? this.formatCurrency(invoice.tax, language) : null,
        total: this.formatCurrency(invoice.total, language),
        items: invoice.items.map((item: any) => ({
          ...item,
          formattedUnitPrice: this.formatCurrency(item.unitPrice, language),
          formattedTotal: this.formatCurrency(item.total, language)
        }))
      },
      language,
      languageConfig: this.getLanguageConfig(language)
    };
  }

  // Generate payment reminder in language
  generatePaymentReminder(invoice: any, language: string, daysOverdue: number): string {
    const t = (key: string, params?: any) => this.translate(key, language, params);

    const templates = {
      1: t('reminders.firstReminder', {
        invoiceNumber: invoice.invoiceNumber,
        dueDate: this.formatDate(invoice.dueDate, language),
        amount: this.formatCurrency(invoice.total, language)
      }),
      7: t('reminders.secondReminder', {
        invoiceNumber: invoice.invoiceNumber,
        daysOverdue,
        amount: this.formatCurrency(invoice.total, language)
      }),
      14: t('reminders.thirdReminder', {
        invoiceNumber: invoice.invoiceNumber,
        daysOverdue,
        amount: this.formatCurrency(invoice.total, language)
      }),
      30: t('reminders.finalReminder', {
        invoiceNumber: invoice.invoiceNumber,
        daysOverdue,
        amount: this.formatCurrency(invoice.total, language)
      })
    };

    return templates[daysOverdue] || templates[30];
  }

  // Get user's preferred language
  async getUserLanguage(userId: string): Promise<string> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { preferences: true }
      });

      const preferences = user?.preferences as any;
      return preferences?.language || this.defaultLanguage;
    } catch (error) {
      logger.error('Error getting user language:', error);
      return this.defaultLanguage;
    }
  }

  // Update user's language preference
  async updateUserLanguage(userId: string, language: string): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { preferences: true }
      });

      const currentPreferences = (user?.preferences as any) || {};

      await prisma.user.update({
        where: { id: userId },
        data: {
          preferences: {
            ...currentPreferences,
            language
          }
        }
      });
    } catch (error) {
      logger.error('Error updating user language:', error);
      throw error;
    }
  }

  // Detect language from request
  detectLanguage(acceptLanguageHeader?: string): string {
    if (!acceptLanguageHeader) {
      return this.defaultLanguage;
    }

    // Parse Accept-Language header
    const languages = acceptLanguageHeader
      .split(',')
      .map(lang => {
        const parts = lang.trim().split(';');
        const code = parts[0].split('-')[0]; // Get primary language code
        const quality = parts[1] ? parseFloat(parts[1].split('=')[1]) : 1;
        return { code, quality };
      })
      .sort((a, b) => b.quality - a.quality);

    // Find first supported language
    for (const { code } of languages) {
      if (this.languages.has(code)) {
        return code;
      }
    }

    return this.defaultLanguage;
  }
}

export const i18nService = new I18nService();