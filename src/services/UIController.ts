import {
  ProgressInfo,
  ConversionError,
  EventSubscription
} from '@/types';
import { IUIController } from '@/types/interfaces';

/**
 * UIController class - Single Responsibility Principle
 * Handles UI control and DOM manipulation
 */
export class UIController implements IUIController {
  private isDisposed = false;
  private elements: Record<string, HTMLElement> = {};
  private eventListeners: Array<{
    element: HTMLElement;
    event: string;
    handler: EventListener;
  }> = [];

  constructor() {
    this.cacheElements();
  }

  /**
   * Initialize UI controller
   */
  public initialize(): void {
    this.ensureNotDisposed();
    this.setupEventListeners();
    this.showUploadArea();
    this.hideProcessingSection();
    this.hideResultsSection();
  }

  /**
   * Show upload area
   */
  public showUploadArea(): void {
    this.ensureNotDisposed();
    const uploadArea = this.elements.uploadArea;
    if (uploadArea) {
      uploadArea.style.display = 'block';
      uploadArea.classList.remove('hidden');
    }
  }

  /**
   * Hide upload area
   */
  public hideUploadArea(): void {
    this.ensureNotDisposed();
    const uploadArea = this.elements.uploadArea;
    if (uploadArea) {
      uploadArea.style.display = 'none';
      uploadArea.classList.add('hidden');
    }
  }

  /**
   * Show processing section
   */
  public showProcessingSection(): void {
    this.ensureNotDisposed();
    const processingSection = this.elements.processingSection;
    if (processingSection) {
      processingSection.style.display = 'block';
      processingSection.classList.add('active');
    }
  }

  /**
   * Hide processing section
   */
  public hideProcessingSection(): void {
    this.ensureNotDisposed();
    const processingSection = this.elements.processingSection;
    if (processingSection) {
      processingSection.style.display = 'none';
      processingSection.classList.remove('active');
    }
  }

  /**
   * Show results section
   */
  public showResultsSection(): void {
    this.ensureNotDisposed();
    const resultsSection = this.elements.resultsSection;
    if (resultsSection) {
      resultsSection.style.display = 'block';
      resultsSection.classList.add('active');
    }
  }

  /**
   * Hide results section
   */
  public hideResultsSection(): void {
    this.ensureNotDisposed();
    const resultsSection = this.elements.resultsSection;
    if (resultsSection) {
      resultsSection.style.display = 'none';
      resultsSection.classList.remove('active');
    }
  }

  /**
   * Update progress display
   */
  public updateProgress(progress: ProgressInfo): void {
    this.ensureNotDisposed();
    
    // Update progress bar
    const progressFill = this.elements.progressFill;
    if (progressFill) {
      progressFill.style.width = `${progress.progress}%`;
    }

    // Update progress text
    const progressText = this.elements.processingText;
    if (progressText) {
      progressText.textContent = `${progress.fileName}: ${progress.message}`;
    }
  }

  /**
   * Display error message
   */
  public displayError(error: ConversionError): void {
    this.ensureNotDisposed();
    this.showErrorModal(error.message, error.details);
  }

  /**
   * Display success message
   */
  public displaySuccess(message: string): void {
    this.ensureNotDisposed();
    this.showSuccessModal(message);
  }

  /**
   * Clear UI state
   */
  public clearUI(): void {
    this.ensureNotDisposed();
    this.hideProcessingSection();
    this.hideResultsSection();
    this.showUploadArea();
    this.resetProgressBar();
    this.clearResultsGrid();
  }

  /**
   * Setup drag and drop handlers
   */
  public setupDragAndDrop(
    onFilesDropped: (files: FileList) => void
  ): EventSubscription {
    this.ensureNotDisposed();
    
    const uploadArea = this.elements.uploadArea;
    if (!uploadArea) {
      throw new Error('Upload area not found');
    }

    const dragOverHandler = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      uploadArea.classList.add('dragover');
    };

    const dragLeaveHandler = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      uploadArea.classList.remove('dragover');
    };

    const dropHandler = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      uploadArea.classList.remove('dragover');
      
      const dragEvent = e as DragEvent;
      const files = dragEvent.dataTransfer?.files;
      if (files && files.length > 0) {
        onFilesDropped(files);
      }
    };

    this.addEventListener(uploadArea, 'dragover', dragOverHandler);
    this.addEventListener(uploadArea, 'dragenter', dragOverHandler);
    this.addEventListener(uploadArea, 'dragleave', dragLeaveHandler);
    this.addEventListener(uploadArea, 'drop', dropHandler);

    return {
      unsubscribe: () => {
        this.removeEventListener(uploadArea, 'dragover', dragOverHandler);
        this.removeEventListener(uploadArea, 'dragenter', dragOverHandler);
        this.removeEventListener(uploadArea, 'dragleave', dragLeaveHandler);
        this.removeEventListener(uploadArea, 'drop', dropHandler);
      }
    };
  }

  /**
   * Setup file input handler
   */
  public setupFileInput(
    onFilesSelected: (files: FileList) => void
  ): EventSubscription {
    this.ensureNotDisposed();
    
    const fileInput = this.elements.fileInput as HTMLInputElement;
    const fileSelectBtn = this.elements.fileSelectBtn;
    
    if (!fileInput || !fileSelectBtn) {
      throw new Error('File input elements not found');
    }

    const fileChangeHandler = (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        onFilesSelected(target.files);
      }
    };

    const buttonClickHandler = (e: Event) => {
      e.preventDefault();
      fileInput.click();
    };

    this.addEventListener(fileInput, 'change', fileChangeHandler);
    this.addEventListener(fileSelectBtn, 'click', buttonClickHandler);

    return {
      unsubscribe: () => {
        this.removeEventListener(fileInput, 'change', fileChangeHandler);
        this.removeEventListener(fileSelectBtn, 'click', buttonClickHandler);
      }
    };
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    if (this.isDisposed) return;
    
    this.removeAllEventListeners();
    this.elements = {};
    this.isDisposed = true;
  }

  // ===== Private Methods =====

  /**
   * Cache DOM elements
   */
  private cacheElements(): void {
    this.elements = {
      uploadArea: this.getElementById('upload-area'),
      processingSection: this.getElementById('processing-section'),
      resultsSection: this.getElementById('results-section'),
      progressFill: this.getElementById('progress-fill'),
      processingText: this.getElementById('processing-text'),
      resultsGrid: this.getElementById('results-grid'),
      fileInput: this.getElementById('file-input'),
      fileSelectBtn: this.getElementById('file-select-btn'),
      errorModal: this.getElementById('error-modal'),
      successModal: this.getElementById('success-modal'),
      errorMessage: this.getElementById('error-message'),
      successMessage: this.getElementById('success-message'),
      errorModalClose: this.getElementById('error-modal-close'),
      successModalClose: this.getElementById('success-modal-close'),
      errorModalOk: this.getElementById('error-modal-ok'),
      successModalOk: this.getElementById('success-modal-ok'),
      loadingOverlay: this.getElementById('loading-overlay')
    };
  }

  /**
   * Get element by ID with error handling
   */
  private getElementById(id: string): HTMLElement {
    const element = document.getElementById(id);
    if (!element) {
      console.warn(`Element with ID '${id}' not found`);
      return document.createElement('div'); // Return dummy element
    }
    return element;
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Modal close handlers
    this.setupModalHandlers();
  }

  /**
   * Setup modal handlers
   */
  private setupModalHandlers(): void {
    const errorModal = this.elements.errorModal;
    const successModal = this.elements.successModal;

    // Error modal handlers
    if (this.elements.errorModalClose) {
      this.addEventListener(this.elements.errorModalClose, 'click', () => {
        this.hideModal(errorModal);
      });
    }

    if (this.elements.errorModalOk) {
      this.addEventListener(this.elements.errorModalOk, 'click', () => {
        this.hideModal(errorModal);
      });
    }

    // Success modal handlers
    if (this.elements.successModalClose) {
      this.addEventListener(this.elements.successModalClose, 'click', () => {
        this.hideModal(successModal);
      });
    }

    if (this.elements.successModalOk) {
      this.addEventListener(this.elements.successModalOk, 'click', () => {
        this.hideModal(successModal);
      });
    }

    // Close modals when clicking outside
    this.addEventListener(errorModal, 'click', (e) => {
      if (e.target === errorModal) {
        this.hideModal(errorModal);
      }
    });

    this.addEventListener(successModal, 'click', (e) => {
      if (e.target === successModal) {
        this.hideModal(successModal);
      }
    });
  }

  /**
   * Show error modal
   */
  private showErrorModal(message: string, details?: string): void {
    const errorModal = this.elements.errorModal;
    const errorMessage = this.elements.errorMessage;
    
    if (errorMessage) {
      errorMessage.textContent = message;
      if (details) {
        errorMessage.textContent += `\n詳細: ${details}`;
      }
    }

    this.showModal(errorModal);
  }

  /**
   * Show success modal
   */
  private showSuccessModal(message: string): void {
    const successModal = this.elements.successModal;
    const successMessage = this.elements.successMessage;
    
    if (successMessage) {
      successMessage.textContent = message;
    }

    this.showModal(successModal);
  }

  /**
   * Show modal
   */
  private showModal(modal: HTMLElement): void {
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('active');
    }
  }

  /**
   * Hide modal
   */
  private hideModal(modal: HTMLElement): void {
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('active');
    }
  }

  /**
   * Reset progress bar
   */
  private resetProgressBar(): void {
    const progressFill = this.elements.progressFill;
    const processingText = this.elements.processingText;

    if (progressFill) {
      progressFill.style.width = '0%';
    }

    if (processingText) {
      processingText.textContent = '準備中...';
    }
  }

  /**
   * Clear results grid
   */
  private clearResultsGrid(): void {
    const resultsGrid = this.elements.resultsGrid;
    if (resultsGrid) {
      resultsGrid.innerHTML = '';
    }
  }

  /**
   * Add event listener with tracking
   */
  private addEventListener(
    element: HTMLElement,
    event: string,
    handler: EventListener
  ): void {
    element.addEventListener(event, handler);
    this.eventListeners.push({ element, event, handler });
  }

  /**
   * Remove specific event listener
   */
  private removeEventListener(
    element: HTMLElement,
    event: string,
    handler: EventListener
  ): void {
    element.removeEventListener(event, handler);
    const index = this.eventListeners.findIndex(
      item => item.element === element && 
               item.event === event && 
               item.handler === handler
    );
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * Remove all event listeners
   */
  private removeAllEventListeners(): void {
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.eventListeners = [];
  }

  /**
   * Ensure the instance is not disposed
   */
  private ensureNotDisposed(): void {
    if (this.isDisposed) {
      throw new Error('UIController has been disposed');
    }
  }
} 