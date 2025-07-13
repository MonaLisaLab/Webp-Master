import { EventCallback, EventSubscription } from '@/types';

/**
 * 🌍 Supported Languages
 */
export type SupportedLanguage = 'ja' | 'en';

export interface LanguageConfig {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  region: string;
}

export interface TranslationKey {
  [key: string]: string | TranslationKey;
}

export interface TranslationData {
  [language: string]: TranslationKey;
}

/**
 * 🌏 I18nService - SEO-optimized internationalization service
 * Handles language switching, URL routing, translations, and SEO meta tags
 */
export class I18nService {
  private currentLanguage: SupportedLanguage = 'ja';
  private translations: TranslationData = {};
  private languageChangeCallbacks: EventCallback<SupportedLanguage>[] = [];
  private isInitialized = false;
  
  private readonly supportedLanguages: Record<SupportedLanguage, LanguageConfig> = {
    ja: {
      code: 'ja',
      name: 'Japanese',
      nativeName: '日本語',
      direction: 'ltr',
      region: 'JP'
    },
    en: {
      code: 'en',
      name: 'English',
      nativeName: 'English',
      direction: 'ltr',
      region: 'US'
    }
  };

  constructor() {
    this.detectLanguageFromURL();
  }

  /**
   * Initialize the I18n service
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Load translation data
    await this.loadTranslations();
    
    // Setup URL routing
    this.setupRouting();
    
    // Update document language
    this.updateDocumentLanguage();
    
    this.isInitialized = true;
  }

  /**
   * Get current language
   */
  public getCurrentLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  /**
   * Get supported languages
   */
  public getSupportedLanguages(): LanguageConfig[] {
    return Object.values(this.supportedLanguages);
  }

  /**
   * Get language config
   */
  public getLanguageConfig(language?: SupportedLanguage): LanguageConfig {
    return this.supportedLanguages[language || this.currentLanguage];
  }

  /**
   * Switch language with SEO-friendly URL update
   */
  public async switchLanguage(language: SupportedLanguage): Promise<void> {
    if (!this.isLanguageSupported(language)) {
      return;
    }

    if (language === this.currentLanguage) return;

    this.currentLanguage = language;

    // Save to localStorage
    localStorage.setItem('webp-master-language', language);

    // Update URL without page reload
    this.updateURL(language);

    // Update document language
    this.updateDocumentLanguage();

    // Notify listeners
    this.notifyLanguageChange(language);
  }

  /**
   * Get translation for a key
   */
  public t(key: string, params: Record<string, string> = {}): string {
    const translation = this.getNestedTranslation(key, this.currentLanguage);
    
    if (!translation) {
      return key;
    }

    // Replace parameters
    return this.interpolateParams(translation, params);
  }

  /**
   * Get current language URL prefix
   */
  public getLanguagePrefix(): string {
    return this.currentLanguage === 'ja' ? '' : `/${this.currentLanguage}`;
  }

  /**
   * Generate language-specific URLs for hreflang
   */
  public generateHreflangUrls(): Record<string, string> {
    const baseUrl = window.location.origin;
    const currentPath = this.getCurrentPath();
    
    return {
      'ja': `${baseUrl}${currentPath}`,
      'en': `${baseUrl}/en${currentPath}`,
      'x-default': `${baseUrl}${currentPath}`
    };
  }

  /**
   * Subscribe to language changes
   */
  public onLanguageChange(callback: EventCallback<SupportedLanguage>): EventSubscription {
    this.languageChangeCallbacks.push(callback);
    
    return {
      unsubscribe: () => {
        const index = this.languageChangeCallbacks.indexOf(callback);
        if (index > -1) {
          this.languageChangeCallbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * Detect and set best language for user
   */
  public detectBestLanguage(): SupportedLanguage {
    // 1. Check URL
    const urlLanguage = this.getLanguageFromURL();
    if (urlLanguage && this.isLanguageSupported(urlLanguage)) {
      return urlLanguage;
    }

    // 2. Check localStorage
    const savedLanguage = localStorage.getItem('webp-master-language') as SupportedLanguage;
    if (savedLanguage && this.isLanguageSupported(savedLanguage)) {
      return savedLanguage;
    }

    // 3. Check browser language
    const browserLanguage = this.getBrowserLanguage();
    if (browserLanguage && this.isLanguageSupported(browserLanguage)) {
      return browserLanguage;
    }

    // 4. Default to Japanese
    return 'ja';
  }

  // ===== Private Methods =====

  /**
   * Load translation data
   */
  private async loadTranslations(): Promise<void> {
    try {
      const [jaTranslations, enTranslations] = await Promise.all([
        import('../translations/ja.json'),
        import('../translations/en.json')
      ]);

      this.translations = {
        ja: jaTranslations.default || jaTranslations,
        en: enTranslations.default || enTranslations
      };

    } catch (error) {
      console.error('❌ Failed to load translations:', error);
      // Use fallback empty translations
      this.translations = { ja: {}, en: {} };
    }
  }

  /**
   * Setup URL routing
   */
  private setupRouting(): void {
    // Handle browser back/forward
    window.addEventListener('popstate', (_event) => {
      const language = this.getLanguageFromURL();
      if (language && language !== this.currentLanguage) {
        this.currentLanguage = language;
        this.updateDocumentLanguage();
        this.notifyLanguageChange(language);
      }
    });
  }

  /**
   * Detect language from current URL
   */
  private detectLanguageFromURL(): void {
    const detectedLanguage = this.detectBestLanguage();
    this.currentLanguage = detectedLanguage;
  }

  /**
   * Get language from URL path
   */
  private getLanguageFromURL(): SupportedLanguage | null {
    const path = window.location.pathname;
    const match = path.match(/^\/([a-z]{2})\//);
    
    if (match) {
      const language = match[1] as SupportedLanguage;
      return this.isLanguageSupported(language) ? language : null;
    }
    
    // If no language prefix, default to Japanese
    return path === '/' || !path.startsWith('/en') ? 'ja' : null;
  }

  /**
   * Get current path without language prefix
   */
  private getCurrentPath(): string {
    const path = window.location.pathname;
    const match = path.match(/^\/[a-z]{2}(\/.*)?$/);
    return match ? (match[1] || '/') : path;
  }

  /**
   * Get browser language preference
   */
  private getBrowserLanguage(): SupportedLanguage | null {
    const browserLang = navigator.language || navigator.languages?.[0];
    if (!browserLang) return null;

    // Extract language code (e.g., 'ja-JP' -> 'ja')
    const langCode = browserLang.split('-')[0] as SupportedLanguage;
    return this.isLanguageSupported(langCode) ? langCode : null;
  }

  /**
   * Check if language is supported
   */
  private isLanguageSupported(language: string): language is SupportedLanguage {
    return Object.keys(this.supportedLanguages).includes(language);
  }

  /**
   * Update URL without page reload
   */
  private updateURL(language: SupportedLanguage): void {
    const currentPath = this.getCurrentPath();
    const newPath = language === 'ja' ? currentPath : `/en${currentPath}`;
    
    // Update URL without triggering navigation
    window.history.pushState({ language }, '', newPath);
  }

  /**
   * Update document language attributes
   */
  private updateDocumentLanguage(): void {
    const config = this.getLanguageConfig();
    
    // Update html lang attribute
    document.documentElement.lang = config.code;
    
    // Update html dir attribute
    document.documentElement.dir = config.direction;
  }

  /**
   * Get nested translation value
   */
  private getNestedTranslation(key: string, language: SupportedLanguage): string | null {
    const keys = key.split('.');
    let current: any = this.translations[language];
    
    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        return null;
      }
    }
    
    return typeof current === 'string' ? current : null;
  }

  /**
   * Interpolate parameters in translation
   */
  private interpolateParams(text: string, params: Record<string, string>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return params[key] || match;
    });
  }

  /**
   * Notify language change listeners
   */
  private notifyLanguageChange(language: SupportedLanguage): void {
    this.languageChangeCallbacks.forEach(callback => {
      try {
        callback(language);
      } catch (error) {
        console.error('Error in language change callback:', error);
      }
    });
  }
} 