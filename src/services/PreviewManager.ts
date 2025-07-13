import {
  ConversionResult,
  EventCallback,
  EventSubscription
} from '@/types';
import { IPreviewManager } from '@/types/interfaces';
import { I18nService } from './I18nService';

/**
 * PreviewManager class - Extended with internationalization support
 * Handles image preview and download operations with multi-language support
 */
export class PreviewManager implements IPreviewManager {
  private readonly downloadCallbacks: EventCallback<ConversionResult>[] = [];
  private isDisposed = false;
  private resultsGrid: HTMLElement | null = null;
  private i18nService?: I18nService;

  constructor() {
    this.resultsGrid = document.getElementById('results-grid');
  }

  /**
   * Set I18n service for translations
   */
  public setI18nService(i18nService: I18nService): void {
    this.i18nService = i18nService;
  }

  /**
   * Generate preview element for conversion result
   */
  public async generatePreview(result: ConversionResult): Promise<HTMLElement> {
    this.ensureNotDisposed();
    
    const resultCard = document.createElement('div');
    resultCard.className = 'result-card';
    resultCard.innerHTML = this.createResultCardHTML(result);
    
    // Setup event listeners for actions
    this.setupResultCardEvents(resultCard, result);
    
    return resultCard;
  }

  /**
   * Display multiple results in grid
   */
  public displayResults(results: ConversionResult[]): void {
    this.ensureNotDisposed();
    
    if (!this.resultsGrid) {
      return;
    }

    // Clear previous results
    this.resultsGrid.innerHTML = '';

    // Add each result card
    results.forEach(async (result) => {
      const preview = await this.generatePreview(result);
      this.resultsGrid!.appendChild(preview);
    });

    // Add bulk actions
    this.addBulkActions(results);
  }

  /**
   * Clear all previews
   */
  public clearPreviews(): void {
    this.ensureNotDisposed();
    
    if (this.resultsGrid) {
      this.resultsGrid.innerHTML = '';
    }
  }

  /**
   * Download single file
   */
  public downloadFile(result: ConversionResult): void {
    this.ensureNotDisposed();
    
    const link = document.createElement('a');
    link.href = result.convertedUrl;
    link.download = this.generateFileName(result.originalFile.name);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    this.notifyDownloadRequest(result);
  }

  /**
   * Download all files
   */
  public downloadAll(results: ConversionResult[]): void {
    this.ensureNotDisposed();
    
    results.forEach((result, index) => {
      setTimeout(() => {
        this.downloadFile(result);
      }, 100 * index);
    });
  }

  /**
   * Subscribe to download events
   */
  public onDownloadRequest(callback: EventCallback<ConversionResult>): EventSubscription {
    this.ensureNotDisposed();
    
    this.downloadCallbacks.push(callback);
    
    return {
      unsubscribe: () => {
        const index = this.downloadCallbacks.indexOf(callback);
        if (index > -1) {
          this.downloadCallbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    if (this.isDisposed) return;
    
    this.downloadCallbacks.length = 0;
    this.resultsGrid = null;
    this.isDisposed = true;
  }

  // ===== Private Methods =====

  /**
   * Create result card HTML
   */
  private createResultCardHTML(result: ConversionResult): string {
    const t = this.i18nService?.t.bind(this.i18nService) || ((key: string) => key);
    
    // Calculate reduction percentage properly
    const reductionPercent = result.compressionRatio > 0 ? result.compressionRatio : 0;
    const isReduced = reductionPercent > 0;
    
    return `
      <div class="result-card__preview">
        <div class="result-card__image-container">
          <img src="${result.originalUrl}" alt="${t('results.original')}" class="result-card__image">
          <span class="result-card__label">${t('results.original')}</span>
        </div>
        <div class="result-card__image-container">
          <img src="${result.convertedUrl}" alt="${t('results.converted')}" class="result-card__image">
          <span class="result-card__label">${t('results.converted')}</span>
        </div>
      </div>
      
      <div class="result-card__info">
        <h3 class="result-card__title">${result.originalFile.name}</h3>
        
        <div class="result-card__size">
          <svg class="result-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path>
            <polyline points="14,2 14,8 20,8"></polyline>
          </svg>
          <span class="result-card__size-detail">
            ${this.formatFileSize(result.originalFile.size)} → ${this.formatFileSize(result.convertedSize)}
          </span>
        </div>
        
        <div class="result-card__reduction ${isReduced ? 'positive' : 'negative'}">
          <svg class="result-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
            <polyline points="17 6 23 6 23 12"></polyline>
          </svg>
          <span class="result-card__reduction-detail">
            ${isReduced ? `${reductionPercent}% 削減` : `${Math.abs(reductionPercent)}% 増加`}
          </span>
        </div>
        
        <div class="result-card__time">
          <svg class="result-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12,6 12,12 16,14"></polyline>
          </svg>
          <span class="result-card__time-detail">
            ${this.formatProcessingTime(result.processingTime)}
          </span>
        </div>
      </div>
      
      <div class="result-card__actions">
        <button class="button button--primary download-btn" data-action="download">
          <svg class="button__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"></path>
            <polyline points="7,10 12,15 17,10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          ${t('results.download')}
        </button>
        <button class="button button--secondary fullsize-btn" data-action="fullsize">
          <svg class="button__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"></path>
          </svg>
          ${t('results.viewFullsize')}
        </button>
      </div>
    `;
  }

  /**
   * Setup event listeners for result card
   */
  private setupResultCardEvents(card: HTMLElement, result: ConversionResult): void {
    const downloadBtn = card.querySelector('.download-btn');
    const fullsizeBtn = card.querySelector('.fullsize-btn');

    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        this.downloadFile(result);
      });
    }

    if (fullsizeBtn) {
      fullsizeBtn.addEventListener('click', () => {
        this.viewFullsize(result);
      });
    }
  }

  /**
   * Generate filename for download
   */
  private generateFileName(originalName: string): string {
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
    return `${nameWithoutExt}.webp`;
  }

  /**
   * Format file size for display
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Format processing time for display
   */
  private formatProcessingTime(milliseconds: number): string {
    if (milliseconds < 1000) {
      return `${Math.round(milliseconds)}ms`;
    } else {
      return `${(milliseconds / 1000).toFixed(2)}s`;
    }
  }

  /**
   * Add bulk actions with improved layout
   */
  private addBulkActions(results: ConversionResult[]): void {
    if (!this.resultsGrid || results.length === 0) return;

    const t = this.i18nService?.t.bind(this.i18nService) || ((key: string) => key);

    // Create bulk actions container
    const bulkActions = document.createElement('div');
    bulkActions.className = 'bulk-actions';
    bulkActions.innerHTML = `
      <button class="button button--success bulk-action-btn" data-action="download-all">
        <svg class="button__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"></path>
          <polyline points="7,10 12,15 17,10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        ${t('results.downloadAll')}
      </button>
      <button class="button button--outline bulk-action-btn" data-action="clear">
        <svg class="button__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3,6 5,6 21,6"></polyline>
          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
        </svg>
        ${t('results.clear')}
      </button>
    `;

    // Insert bulk actions at the beginning of results grid
    this.resultsGrid.insertBefore(bulkActions, this.resultsGrid.firstChild);

    // Setup bulk action events
    const downloadAllBtn = bulkActions.querySelector('[data-action="download-all"]');
    const clearBtn = bulkActions.querySelector('[data-action="clear"]');

    if (downloadAllBtn) {
      downloadAllBtn.addEventListener('click', () => {
        this.downloadAll(results);
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.clearPreviews();
      });
    }
  }

  /**
   * View image in fullsize modal
   */
  private viewFullsize(result: ConversionResult): void {
    const modal = document.createElement('div');
    modal.className = 'fullsize-modal';
    modal.innerHTML = `
      <img src="${result.convertedUrl}" alt="${result.originalFile.name}">
    `;

    document.body.appendChild(modal);

    const closeModal = () => {
      document.body.removeChild(modal);
    };

    // Close on click
    modal.addEventListener('click', closeModal);

    // Close on Escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handleKeyDown);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
  }

  /**
   * Notify download request listeners
   */
  private notifyDownloadRequest(result: ConversionResult): void {
    this.downloadCallbacks.forEach(callback => {
      try {
        callback(result);
      } catch (error) {
        console.error('Error in download callback:', error);
      }
    });
  }

  /**
   * Ensure the instance is not disposed
   */
  private ensureNotDisposed(): void {
    if (this.isDisposed) {
      throw new Error('PreviewManager has been disposed');
    }
  }
} 