import {
  ConversionResult,
  EventCallback,
  EventSubscription
} from '@/types';
import { IPreviewManager } from '@/types/interfaces';

/**
 * PreviewManager class - Single Responsibility Principle
 * Handles preview generation and download functionality
 */
export class PreviewManager implements IPreviewManager {
  private readonly downloadCallbacks: EventCallback<ConversionResult>[] = [];
  private isDisposed = false;
  private resultsGrid: HTMLElement | null = null;

  constructor() {
    this.resultsGrid = document.getElementById('results-grid');
  }

  /**
   * Generate preview element for conversion result
   */
  public async generatePreview(result: ConversionResult): Promise<HTMLElement> {
    this.ensureNotDisposed();
    
    const card = document.createElement('div');
    card.className = 'result-card';
    card.setAttribute('data-result-id', result.id);

    // Create preview section
    const previewSection = this.createPreviewSection(result);
    
    // Create info section
    const infoSection = this.createInfoSection(result);
    
    // Create actions section
    const actionsSection = this.createActionsSection(result);

    card.appendChild(previewSection);
    card.appendChild(infoSection);
    card.appendChild(actionsSection);

    return card;
  }

  /**
   * Display conversion results
   */
  public displayResults(results: ConversionResult[]): void {
    this.ensureNotDisposed();
    
    if (!this.resultsGrid) {
      console.error('Results grid not found');
      return;
    }

    // Clear previous results
    this.clearPreviews();

    // Add each result
    results.forEach(async (result) => {
      try {
        const preview = await this.generatePreview(result);
        this.resultsGrid?.appendChild(preview);
      } catch (error) {
        console.error('Error generating preview:', error);
      }
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
      
      // Also remove bulk actions container
      const resultsSection = this.resultsGrid.parentElement;
      if (resultsSection) {
        const bulkActions = resultsSection.querySelector('.bulk-actions');
        if (bulkActions) {
          resultsSection.removeChild(bulkActions);
        }
      }
    }
  }

  /**
   * Download single file
   */
  public downloadFile(result: ConversionResult): void {
    this.ensureNotDisposed();
    
    try {
      const link = document.createElement('a');
      link.href = result.convertedUrl;
      link.download = this.generateFileName(result.originalFile.name);
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      this.notifyDownloadRequest(result);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  }

  /**
   * Download all files as zip (simplified - individual downloads)
   */
  public downloadAll(results: ConversionResult[]): void {
    this.ensureNotDisposed();
    
    results.forEach((result, index) => {
      // Stagger downloads to avoid browser restrictions
      setTimeout(() => {
        this.downloadFile(result);
      }, index * 200);
    });
  }

  /**
   * Subscribe to download request events
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
    this.clearPreviews();
    this.isDisposed = true;
  }

  // ===== Private Methods =====

  /**
   * Create preview section with before/after images
   */
  private createPreviewSection(result: ConversionResult): HTMLElement {
    const section = document.createElement('div');
    section.className = 'result-card__preview';

    // Original image
    const originalImg = document.createElement('img');
    originalImg.src = result.originalUrl;
    originalImg.className = 'result-card__image';
    originalImg.alt = `Original: ${result.originalFile.name}`;
    originalImg.title = 'Original Image';

    // Converted image
    const convertedImg = document.createElement('img');
    convertedImg.src = result.convertedUrl;
    convertedImg.className = 'result-card__image';
    convertedImg.alt = `Converted: ${result.originalFile.name}`;
    convertedImg.title = 'Converted WebP Image';

    // Labels
    const originalLabel = document.createElement('div');
    originalLabel.className = 'result-card__label';
    originalLabel.textContent = 'Original';

    const convertedLabel = document.createElement('div');
    convertedLabel.className = 'result-card__label';
    convertedLabel.textContent = 'WebP';

    const originalContainer = document.createElement('div');
    originalContainer.className = 'result-card__image-container';
    originalContainer.appendChild(originalImg);
    originalContainer.appendChild(originalLabel);

    const convertedContainer = document.createElement('div');
    convertedContainer.className = 'result-card__image-container';
    convertedContainer.appendChild(convertedImg);
    convertedContainer.appendChild(convertedLabel);

    section.appendChild(originalContainer);
    section.appendChild(convertedContainer);

    return section;
  }

  /**
   * Create info section with file details
   */
  private createInfoSection(result: ConversionResult): HTMLElement {
    const section = document.createElement('div');
    section.className = 'result-card__info';

    // File title
    const title = document.createElement('h3');
    title.className = 'result-card__title';
    title.textContent = result.originalFile.name;

    // File size info
    const sizeInfo = document.createElement('p');
    sizeInfo.className = 'result-card__size';
    sizeInfo.innerHTML = `
      <svg class="result-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path>
        <polyline points="14,2 14,8 20,8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10,9 9,9 8,9"></polyline>
      </svg>
      ${this.formatFileSize(result.originalFile.size)} → ${this.formatFileSize(result.convertedSize)}
    `;

    // Compression ratio
    const reductionInfo = document.createElement('p');
    reductionInfo.className = 'result-card__reduction';
    const reductionText = result.compressionRatio > 0 
      ? `${result.compressionRatio}% 圧縮`
      : 'サイズが増加しました';
    reductionInfo.innerHTML = `
      <svg class="result-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="21,8 21,21 3,21 3,8"></polyline>
        <rect x="1" y="3" width="22" height="5"></rect>
        <line x1="10" y1="12" x2="14" y2="12"></line>
      </svg>
      ${reductionText}
    `;

    // Processing time
    const timeInfo = document.createElement('p');
    timeInfo.className = 'result-card__time';
    timeInfo.innerHTML = `
      <svg class="result-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12,6 12,12 16,14"></polyline>
      </svg>
      ${this.formatProcessingTime(result.processingTime)}
    `;

    section.appendChild(title);
    section.appendChild(sizeInfo);
    section.appendChild(reductionInfo);
    section.appendChild(timeInfo);

    return section;
  }

  /**
   * Create actions section with download buttons
   */
  private createActionsSection(result: ConversionResult): HTMLElement {
    const section = document.createElement('div');
    section.className = 'result-card__actions';

    // Download button
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'button button--primary';
    downloadBtn.innerHTML = `
      <svg class="button__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"></path>
        <polyline points="7,10 12,15 17,10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
      ダウンロード
    `;
    downloadBtn.addEventListener('click', () => {
      this.downloadFile(result);
    });

    // View fullsize button
    const viewBtn = document.createElement('button');
    viewBtn.className = 'button button--secondary';
    viewBtn.innerHTML = `
      <svg class="button__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M15 3h4a2 2 0 012 2v4"></path>
        <path d="M14 9l5-5"></path>
        <path d="M9 21H5a2 2 0 01-2-2v-4"></path>
        <path d="M10 15l-5 5"></path>
      </svg>
      フルサイズで表示
    `;
    viewBtn.addEventListener('click', () => {
      this.viewFullsize(result);
    });

    section.appendChild(downloadBtn);
    section.appendChild(viewBtn);

    return section;
  }

  /**
   * Generate filename for download
   */
  private generateFileName(originalName: string): string {
    const nameWithoutExtension = originalName.replace(/\.[^/.]+$/, '');
    return `${nameWithoutExtension}.webp`;
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
      return `${milliseconds}ms`;
    } else {
      const seconds = (milliseconds / 1000).toFixed(1);
      return `${seconds}s`;
    }
  }

  /**
   * Add bulk actions (Download All, Clear)
   */
  private addBulkActions(results: ConversionResult[]): void {
    if (!this.resultsGrid) return;

    const bulkActionsContainer = document.createElement('div');
    bulkActionsContainer.className = 'bulk-actions';

    // Download All button
    const downloadAllBtn = document.createElement('button');
    downloadAllBtn.className = 'button button--success';
    downloadAllBtn.innerHTML = `
      <svg class="button__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"></path>
        <polyline points="7,10 12,15 17,10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
      すべてダウンロード
    `;
    downloadAllBtn.addEventListener('click', () => {
      this.downloadAll(results);
    });

    // Clear button
    const clearBtn = document.createElement('button');
    clearBtn.className = 'button button--outline';
    clearBtn.innerHTML = `
      <svg class="button__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="3,6 5,6 21,6"></polyline>
        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
      </svg>
      クリア
    `;
    clearBtn.addEventListener('click', () => {
      this.clearPreviews();
    });

    bulkActionsContainer.appendChild(downloadAllBtn);
    bulkActionsContainer.appendChild(clearBtn);

    // Add to results grid parent
    const resultsSection = this.resultsGrid.parentElement;
    if (resultsSection) {
      resultsSection.appendChild(bulkActionsContainer);
    }
  }

  /**
   * View image in fullsize
   */
  private viewFullsize(result: ConversionResult): void {
    const modal = document.createElement('div');
    modal.className = 'fullsize-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      cursor: pointer;
    `;

    const img = document.createElement('img');
    img.src = result.convertedUrl;
    img.style.cssText = `
      max-width: 90%;
      max-height: 90%;
      object-fit: contain;
      border-radius: 8px;
    `;

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      background: rgba(255, 255, 255, 0.9);
      border: none;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      font-size: 24px;
      cursor: pointer;
      z-index: 10001;
    `;

    const closeModal = () => {
      document.body.removeChild(modal);
    };

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });

    modal.appendChild(img);
    modal.appendChild(closeBtn);
    document.body.appendChild(modal);
  }



  /**
   * Notify download request
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