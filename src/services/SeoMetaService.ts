import { SupportedLanguage } from './I18nService';

export interface MetaTagConfig {
  title?: string;
  description?: string;
  keywords?: string;
  author?: string;
  robots?: string;
  canonical?: string;
}

export interface OpenGraphConfig {
  title?: string;
  description?: string;
  type?: string;
  url?: string;
  image?: string;
  siteName?: string;
  locale?: string;
}

export interface TwitterCardConfig {
  card?: 'summary' | 'summary_large_image' | 'app' | 'player';
  title?: string;
  description?: string;
  image?: string;
  site?: string;
  creator?: string;
}

export interface StructuredDataConfig {
  type: 'WebSite' | 'WebApplication' | 'SoftwareApplication';
  name: string;
  description: string;
  url: string;
  applicationCategory?: string;
  operatingSystem?: string;
  offers?: any;
  author?: any;
  inLanguage?: string[];
}

/**
 * 🎯 SeoMetaService - SEO meta tags and structured data management
 * Handles dynamic meta tag updates, hreflang, Open Graph, Twitter Cards, and JSON-LD
 */
export class SeoMetaService {
  private readonly baseUrl: string;
  private readonly siteName: string = 'WebP Master';
  private currentLanguage: SupportedLanguage = 'ja';

  constructor() {
    this.baseUrl = window.location.origin;
  }

  /**
   * Update all SEO meta tags for language change
   */
  public updateForLanguage(
    language: SupportedLanguage,
    translations: { 
      title: string; 
      description: string; 
      keywords: string;
      ogp?: {
        title: string;
        description: string;
        siteName: string;
        imageAlt: string;
      };
    }
  ): void {
    this.currentLanguage = language;

    // Generate OGP image URL
    const ogpImageUrl = `${this.baseUrl}/src/assets/ogp.png`;

    // Use OGP-specific translations if available, otherwise fallback to meta translations
    const ogpTitle = translations.ogp?.title || translations.title;
    const ogpDescription = translations.ogp?.description || translations.description;
    const ogpSiteName = translations.ogp?.siteName || this.siteName;

    // Update basic meta tags
    this.updateBasicMetaTags({
      title: translations.title,
      description: translations.description,
      keywords: translations.keywords,
      robots: 'index, follow',
      canonical: this.generateCanonicalUrl()
    });

    // Update hreflang links
    this.updateHreflangLinks();

    // Update Open Graph tags
    this.updateOpenGraphTags({
      title: ogpTitle,
      description: ogpDescription,
      type: 'website',
      url: this.getCurrentUrl(),
      image: ogpImageUrl,
      siteName: ogpSiteName,
      locale: this.getLocaleCode(language)
    });

    // Add additional OGP properties
    this.updateMetaTag('og:image:alt', translations.ogp?.imageAlt || ogpTitle, 'property');
    this.updateMetaTag('og:image:width', '1200', 'property');
    this.updateMetaTag('og:image:height', '630', 'property');
    this.updateMetaTag('og:image:type', 'image/png', 'property');

    // Update Twitter Card tags
    this.updateTwitterCardTags({
      card: 'summary_large_image',
      title: ogpTitle,
      description: ogpDescription,
      image: ogpImageUrl,
      site: '@frontend_endo',
      creator: '@frontend_endo'
    });

    // Update structured data
    this.updateStructuredData({
      type: 'WebApplication',
      name: ogpSiteName,
      description: ogpDescription,
      url: this.getCurrentUrl(),
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Any',
      inLanguage: ['ja', 'en'],
      author: {
        '@type': 'Person',
        'name': 'ふろんと遠藤',
        'url': 'https://front-endo.com'
      }
    });

    console.log(`🎯 SEO meta tags updated for language: ${language}`);
  }

  /**
   * Update basic meta tags
   */
  public updateBasicMetaTags(config: MetaTagConfig): void {
    if (config.title) {
      document.title = config.title;
      this.updateMetaTag('og:title', config.title);
    }

    if (config.description) {
      this.updateMetaTag('description', config.description);
      this.updateMetaTag('og:description', config.description);
    }

    if (config.keywords) {
      this.updateMetaTag('keywords', config.keywords);
    }

    if (config.author) {
      this.updateMetaTag('author', config.author);
    }

    if (config.robots) {
      this.updateMetaTag('robots', config.robots);
    }

    if (config.canonical) {
      this.updateLinkTag('canonical', config.canonical);
    }
  }

  /**
   * Update hreflang links for multilingual SEO
   */
  public updateHreflangLinks(): void {
    // Remove existing hreflang links
    this.removeHreflangLinks();

    const currentPath = this.getCurrentPath();
    const hreflangUrls = this.generateHreflangUrls(currentPath);

    // Add new hreflang links
    Object.entries(hreflangUrls).forEach(([hreflang, url]) => {
      this.addHreflangLink(hreflang, url);
    });
  }

  /**
   * Update Open Graph meta tags
   */
  public updateOpenGraphTags(config: OpenGraphConfig): void {
    if (config.title) {
      this.updateMetaTag('og:title', config.title, 'property');
    }

    if (config.description) {
      this.updateMetaTag('og:description', config.description, 'property');
    }

    if (config.type) {
      this.updateMetaTag('og:type', config.type, 'property');
    }

    if (config.url) {
      this.updateMetaTag('og:url', config.url, 'property');
    }

    if (config.image) {
      this.updateMetaTag('og:image', config.image, 'property');
    }

    if (config.siteName) {
      this.updateMetaTag('og:site_name', config.siteName, 'property');
    }

    if (config.locale) {
      this.updateMetaTag('og:locale', config.locale, 'property');
    }
  }

  /**
   * Update Twitter Card meta tags
   */
  public updateTwitterCardTags(config: TwitterCardConfig): void {
    if (config.card) {
      this.updateMetaTag('twitter:card', config.card);
    }

    if (config.title) {
      this.updateMetaTag('twitter:title', config.title);
    }

    if (config.description) {
      this.updateMetaTag('twitter:description', config.description);
    }

    if (config.image) {
      this.updateMetaTag('twitter:image', config.image);
    }

    if (config.site) {
      this.updateMetaTag('twitter:site', config.site);
    }

    if (config.creator) {
      this.updateMetaTag('twitter:creator', config.creator);
    }
  }

  /**
   * Update structured data (JSON-LD)
   */
  public updateStructuredData(config: StructuredDataConfig): void {
    // Remove existing structured data
    this.removeStructuredData();

    // Create new structured data
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': config.type,
      'name': config.name,
      'description': config.description,
      'url': config.url,
      'applicationCategory': config.applicationCategory,
      'operatingSystem': config.operatingSystem,
      'inLanguage': config.inLanguage,
      'author': config.author,
      'offers': {
        '@type': 'Offer',
        'price': '0',
        'priceCurrency': 'USD'
      },
      'featureList': [
        'PNG to WebP conversion',
        'JPEG to WebP conversion',
        'Batch processing',
        'Client-side processing',
        'No server upload required'
      ]
    };

    // Add structured data script
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'structured-data';
    script.textContent = JSON.stringify(structuredData, null, 2);
    document.head.appendChild(script);
  }

  /**
   * Generate sitemap-friendly URLs
   */
  public generateSitemapUrls(): Array<{ url: string; language: SupportedLanguage }> {
    const baseUrl = this.baseUrl;
    return [
      { url: `${baseUrl}/`, language: 'ja' },
      { url: `${baseUrl}/en/`, language: 'en' }
    ];
  }

  // ===== Private Methods =====

  /**
   * Update or create meta tag
   */
  private updateMetaTag(name: string, content: string, attribute: 'name' | 'property' = 'name'): void {
    let meta = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement;
    
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute(attribute, name);
      document.head.appendChild(meta);
    }
    
    meta.content = content;
  }

  /**
   * Update or create link tag
   */
  private updateLinkTag(rel: string, href: string): void {
    let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
    
    if (!link) {
      link = document.createElement('link');
      link.rel = rel;
      document.head.appendChild(link);
    }
    
    link.href = href;
  }

  /**
   * Add hreflang link
   */
  private addHreflangLink(hreflang: string, href: string): void {
    const link = document.createElement('link');
    link.rel = 'alternate';
    link.hreflang = hreflang;
    link.href = href;
    document.head.appendChild(link);
  }

  /**
   * Remove existing hreflang links
   */
  private removeHreflangLinks(): void {
    const hreflangLinks = document.querySelectorAll('link[rel="alternate"][hreflang]');
    hreflangLinks.forEach(link => link.remove());
  }

  /**
   * Remove existing structured data
   */
  private removeStructuredData(): void {
    const existingScript = document.querySelector('#structured-data');
    if (existingScript) {
      existingScript.remove();
    }
  }

  /**
   * Generate hreflang URLs
   */
  private generateHreflangUrls(currentPath: string): Record<string, string> {
    return {
      'ja': `${this.baseUrl}${currentPath}`,
      'en': `${this.baseUrl}/en${currentPath}`,
      'x-default': `${this.baseUrl}${currentPath}`
    };
  }

  /**
   * Get current URL
   */
  private getCurrentUrl(): string {
    return window.location.href;
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
   * Generate canonical URL
   */
  private generateCanonicalUrl(): string {
    const currentPath = this.getCurrentPath();
    
    // Default canonical to Japanese version (no language prefix)
    return `${this.baseUrl}${currentPath}`;
  }

  /**
   * Get locale code for language
   */
  private getLocaleCode(language: SupportedLanguage): string {
    const locales: Record<SupportedLanguage, string> = {
      ja: 'ja_JP',
      en: 'en_US'
    };
    return locales[language];
  }
} 