import {
  ProgressInfo,
  ConversionError,
  EventCallback,
  EventSubscription
} from '@/types';
import { IUIController } from '@/types/interfaces';
import { I18nService, SupportedLanguage } from './I18nService';
import { SeoMetaService } from './SeoMetaService';

/**
 * UIController class - Extended with internationalization support
 * Handles UI operations with multi-language support
 */
export class UIController implements IUIController {
  private isDisposed = false;
  private elements: Record<string, HTMLElement> = {};
  private eventListeners: Array<{
    element: HTMLElement;
    event: string;
    handler: EventListener;
  }> = [];

  // I18n services
  private i18nService?: I18nService;
  private seoMetaService?: SeoMetaService;

  constructor() {
    // Services will be injected during initialization
  }

  /**
   * Initialize UI with I18n support
   */
  public async initialize(i18nService?: I18nService, seoMetaService?: SeoMetaService): Promise<void> {
    this.ensureNotDisposed();
    
    // Inject services
    if (i18nService) {
      this.i18nService = i18nService;
    }
    if (seoMetaService) {
      this.seoMetaService = seoMetaService;
    }

    // Cache DOM elements
    this.cacheElements();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Setup modal handlers
    this.setupModalHandlers();

    // Initialize language support
    if (this.i18nService) {
      await this.initializeLanguageSupport();
    }
  }

  /**
   * Initialize language support
   */
  private async initializeLanguageSupport(): Promise<void> {
    if (!this.i18nService) return;

    // Initialize I18n service
    await this.i18nService.initialize();

    // Add language switcher to header
    this.addLanguageSwitcher();

    // Subscribe to language changes
    this.i18nService.onLanguageChange((language) => {
      this.updateUIForLanguage(language);
    });

    // Update UI for current language
    this.updateUIForLanguage(this.i18nService.getCurrentLanguage());
  }

  /**
   * Add language switcher to header
   */
  private addLanguageSwitcher(): void {
    if (!this.i18nService) return;

    const header = this.elements.header || document.querySelector('.header .container');
    if (!header) return;

    // Create language switcher container
    const languageSwitcher = document.createElement('div');
    languageSwitcher.className = 'language-switcher';
    languageSwitcher.innerHTML = `
      <button class="language-switcher__button" id="language-switcher">
        <svg class="language-switcher__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"></path>
        </svg>
        <span class="language-switcher__text">言語</span>
      </button>
      <div class="language-switcher__dropdown" id="language-dropdown">
        <button class="language-switcher__option" data-language="ja">
          <span class="language-switcher__flag">🇯🇵</span>
          <span>日本語</span>
        </button>
        <button class="language-switcher__option" data-language="en">
          <span class="language-switcher__flag">🇺🇸</span>
          <span>English</span>
        </button>
      </div>
    `;

    // Insert at the end of header container
    header.appendChild(languageSwitcher);

    // Setup language switcher events
    this.setupLanguageSwitcherEvents();
  }

  /**
   * Setup language switcher events
   */
  private setupLanguageSwitcherEvents(): void {
    const button = document.getElementById('language-switcher');
    const dropdown = document.getElementById('language-dropdown');
    const options = document.querySelectorAll('.language-switcher__option');

    if (!button || !dropdown) return;

    // Toggle dropdown
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('active');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
      dropdown.classList.remove('active');
    });

    // Handle language selection
    options.forEach(option => {
      option.addEventListener('click', (e) => {
        const button = e.currentTarget as HTMLButtonElement;
        const language = button.getAttribute('data-language') as SupportedLanguage;
        
        if (language && this.i18nService) {
          this.i18nService.switchLanguage(language);
          dropdown.classList.remove('active');
        }
      });
    });
  }

  /**
   * Update UI for language change
   */
  private updateUIForLanguage(language: SupportedLanguage): void {
    if (!this.i18nService) return;

    // Update meta tags
    if (this.seoMetaService) {
      this.seoMetaService.updateForLanguage(language, {
        title: this.i18nService.t('meta.title'),
        description: this.i18nService.t('meta.description'),
        keywords: this.i18nService.t('meta.keywords')
      });
    }

    // Update all UI text elements
    this.updateTextElements();

    // Update language switcher text
    this.updateLanguageSwitcherText(language);
  }

  /**
   * Update all text elements with translations
   */
  private updateTextElements(): void {
    if (!this.i18nService) return;

    const t = this.i18nService.t.bind(this.i18nService);

    // Header
    const headerSubtitle = document.querySelector('.header__subtitle');
    if (headerSubtitle) {
      headerSubtitle.textContent = t('header.subtitle');
    }

    // Upload section
    const uploadTitle = document.querySelector('.upload-area__title');
    if (uploadTitle) {
      uploadTitle.textContent = t('upload.title');
    }

    const uploadDescription = document.querySelector('.upload-area__description');
    if (uploadDescription) {
      uploadDescription.textContent = t('upload.description');
    }

    const uploadButton = document.querySelector('.upload-area__button');
    if (uploadButton) {
      const buttonText = uploadButton.querySelector('span:not(.button__icon)');
      if (buttonText) {
        buttonText.textContent = t('upload.button');
      } else {
        // If no span, update the text content after the icon
        const icon = uploadButton.querySelector('svg');
        if (icon) {
          uploadButton.innerHTML = icon.outerHTML + t('upload.button');
        } else {
          uploadButton.textContent = t('upload.button');
        }
      }
    }

    // Upload formats
    const formatsTitle = document.querySelector('.upload-area__formats-title');
    if (formatsTitle) {
      formatsTitle.textContent = t('upload.formats.title');
    }

    // Processing section
    const processingTitle = document.querySelector('.processing-info__title');
    if (processingTitle) {
      const titleText = processingTitle.querySelector('span:not(.processing-info__icon)');
      if (titleText) {
        titleText.textContent = t('processing.title');
      } else {
        // Update text while preserving icon
        const icon = processingTitle.querySelector('svg');
        if (icon) {
          processingTitle.innerHTML = icon.outerHTML + t('processing.title');
        } else {
          processingTitle.textContent = t('processing.title');
        }
      }
    }

    // Results section
    const resultsTitle = document.querySelector('.results-section__title');
    if (resultsTitle) {
      const titleText = resultsTitle.querySelector('span:not(.results-section__icon)');
      if (titleText) {
        titleText.textContent = t('results.title');
      } else {
        // Update text while preserving icon
        const icon = resultsTitle.querySelector('svg');
        if (icon) {
          resultsTitle.innerHTML = icon.outerHTML + t('results.title');
        } else {
          resultsTitle.textContent = t('results.title');
        }
      }
    }

    // Security note
    const securityNote = document.querySelector('.note__text');
    if (securityNote) {
      const noteText = securityNote.querySelector('span:not(.note__icon)');
      if (noteText) {
        noteText.textContent = t('security.note');
      } else {
        // Update text while preserving icon
        const icon = securityNote.querySelector('svg');
        if (icon) {
          securityNote.innerHTML = icon.outerHTML + t('security.note');
        } else {
          securityNote.textContent = t('security.note');
        }
      }
    }

    // Footer
    const footerLink = document.querySelector('.footer__link');
    if (footerLink) {
      const linkText = footerLink.querySelector('span:not(.footer__link-icon)');
      if (linkText) {
        linkText.textContent = t('footer.otherProducts');
      } else {
        // Update text while preserving icon
        const icon = footerLink.querySelector('svg');
        if (icon) {
          footerLink.innerHTML = icon.outerHTML + t('footer.otherProducts');
        } else {
          footerLink.textContent = t('footer.otherProducts');
        }
      }
    }

    const footerText = document.querySelector('.footer__text');
    if (footerText) {
      footerText.textContent = t('footer.copyright');
    }

    // Update bulk action buttons if they exist
    const downloadAllButton = document.querySelector('[data-action="download-all"]');
    if (downloadAllButton) {
      downloadAllButton.textContent = t('results.downloadAll');
    }

    const clearButton = document.querySelector('[data-action="clear"]');
    if (clearButton) {
      clearButton.textContent = t('results.clear');
    }

    // Update modal texts
    this.updateModalTexts();
  }

  /**
   * Update modal texts
   */
  private updateModalTexts(): void {
    if (!this.i18nService) return;

    const t = this.i18nService.t.bind(this.i18nService);

    // Error modal
    const errorModalTitle = document.querySelector('#error-modal .modal__title');
    if (errorModalTitle) {
      errorModalTitle.textContent = t('errors.title');
    }

    const errorModalButton = document.querySelector('#error-modal-ok');
    if (errorModalButton) {
      errorModalButton.textContent = t('modal.close');
    }

    // Success modal
    const successModalTitle = document.querySelector('#success-modal .modal__title');
    if (successModalTitle) {
      successModalTitle.textContent = t('success.title');
    }

    const successModalButton = document.querySelector('#success-modal-ok');
    if (successModalButton) {
      successModalButton.textContent = t('success.ok');
    }
  }

  /**
   * Update language switcher text
   */
  private updateLanguageSwitcherText(language: SupportedLanguage): void {
    const switcherText = document.querySelector('.language-switcher__text');
    if (switcherText && this.i18nService) {
      switcherText.textContent = this.i18nService.t('language.switch');
    }

    // Update active language indicator
    const options = document.querySelectorAll('.language-switcher__option');
    options.forEach(option => {
      const optionLanguage = option.getAttribute('data-language');
      if (optionLanguage === language) {
        option.classList.add('active');
      } else {
        option.classList.remove('active');
      }
    });
  }

  /**
   * Show upload area
   */
  public showUploadArea(): void {
    this.ensureNotDisposed();
    
    const uploadArea = this.elements.uploadArea || document.querySelector('.upload-area');
    if (uploadArea) {
      uploadArea.style.display = 'block';
    }
  }

  /**
   * Hide upload area
   */
  public hideUploadArea(): void {
    this.ensureNotDisposed();
    
    const uploadArea = this.elements.uploadArea || document.querySelector('.upload-area');
    if (uploadArea) {
      uploadArea.style.display = 'none';
    }
  }

  /**
   * Show processing section
   */
  public showProcessingSection(): void {
    this.ensureNotDisposed();
    
    const processingSection = this.getElementById('processing-section');
    processingSection.classList.add('active');
  }

  /**
   * Hide processing section
   */
  public hideProcessingSection(): void {
    this.ensureNotDisposed();
    
    const processingSection = this.getElementById('processing-section');
    processingSection.classList.remove('active');
  }

  /**
   * Show results section
   */
  public showResultsSection(): void {
    this.ensureNotDisposed();
    
    const resultsSection = this.getElementById('results-section');
    resultsSection.classList.add('active');
  }

  /**
   * Hide results section
   */
  public hideResultsSection(): void {
    this.ensureNotDisposed();
    
    const resultsSection = this.getElementById('results-section');
    resultsSection.classList.remove('active');
  }

  /**
   * Update progress display
   */
  public updateProgress(progress: ProgressInfo): void {
    this.ensureNotDisposed();
    
    const progressBar = this.getElementById('progress-fill');
    const progressText = this.getElementById('processing-text');
    
    progressBar.style.width = `${progress.progress}%`;
    
    // Use translated progress message if available
    if (this.i18nService) {
      const stageKey = `processing.${progress.stage}`;
      const translatedStage = this.i18nService.t(stageKey);
      progressText.textContent = translatedStage !== stageKey ? translatedStage : progress.message;
    } else {
      progressText.textContent = progress.message;
    }
  }

  /**
   * Display error message
   */
  public displayError(error: ConversionError): void {
    this.ensureNotDisposed();
    
    let errorMessage = error.message;
    
    // Use translated error message if available
    if (this.i18nService) {
      const errorKey = `errors.${error.errorType}`;
      const translatedError = this.i18nService.t(errorKey);
      if (translatedError !== errorKey) {
        errorMessage = translatedError;
      }
    }
    
    this.showErrorModal(errorMessage, error.details);
  }

  /**
   * Display success message
   */
  public displaySuccess(message: string): void {
    this.ensureNotDisposed();
    
    // Use translated success message if available
    let successMessage = message;
    if (this.i18nService) {
      const translatedMessage = this.i18nService.t('success.singleFile');
      if (translatedMessage) {
        successMessage = translatedMessage;
      }
    }
    
    this.showSuccessModal(successMessage);
  }

  /**
   * Clear UI state
   */
  public clearUI(): void {
    this.ensureNotDisposed();
    
    this.hideProcessingSection();
    this.hideResultsSection();
    this.clearResultsGrid();
    this.resetProgressBar();
  }

  /**
   * Setup drag and drop handlers
   */
  public setupDragAndDrop(
    onFilesDropped: (files: FileList) => void
  ): EventSubscription {
    this.ensureNotDisposed();
    
    const uploadArea = this.getElementById('upload-area');

    const dragOverHandler = (e: Event) => {
      e.preventDefault();
      uploadArea.classList.add('dragover');
    };

    const dragLeaveHandler = (e: Event) => {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
    };

    const dropHandler = (e: Event) => {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
      
      const dragEvent = e as DragEvent;
      const files = dragEvent.dataTransfer?.files;
      
      if (files && files.length > 0) {
        onFilesDropped(files);
      }
    };

    this.addEventListener(uploadArea, 'dragover', dragOverHandler);
    this.addEventListener(uploadArea, 'dragleave', dragLeaveHandler);
    this.addEventListener(uploadArea, 'drop', dropHandler);

    return {
      unsubscribe: () => {
        this.removeEventListener(uploadArea, 'dragover', dragOverHandler);
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
    
    const fileInput = this.getElementById('file-input') as HTMLInputElement;
    const fileButton = this.getElementById('file-select-btn');

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
    this.addEventListener(fileButton, 'click', buttonClickHandler);

    return {
      unsubscribe: () => {
        this.removeEventListener(fileInput, 'change', fileChangeHandler);
        this.removeEventListener(fileButton, 'click', buttonClickHandler);
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
    const elementIds = [
      'upload-area', 'processing-section', 'results-section',
      'progress-fill', 'processing-text', 'results-grid',
      'file-input', 'file-select-btn', 'error-modal',
      'success-modal', 'error-modal-close', 'success-modal-close',
      'error-modal-ok', 'success-modal-ok', 'error-message', 'success-message'
    ];

    elementIds.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        this.elements[id] = element;
      }
    });

    // Cache additional elements
    this.elements.header = document.querySelector('.header') as HTMLElement;
  }

  /**
   * Get element by ID with error handling
   */
  private getElementById(id: string): HTMLElement {
    if (this.elements[id]) {
      return this.elements[id];
    }

    const element = document.getElementById(id);
    if (!element) {
      throw new Error(`Element with id '${id}' not found`);
    }

    this.elements[id] = element;
    return element;
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Setup existing event listeners
  }

  /**
   * Setup modal handlers
   */
  private setupModalHandlers(): void {
    const errorModal = this.elements['error-modal'];
    const successModal = this.elements['success-modal'];
    const errorClose = this.elements['error-modal-close'];
    const successClose = this.elements['success-modal-close'];
    const errorOk = this.elements['error-modal-ok'];
    const successOk = this.elements['success-modal-ok'];

    if (errorClose) {
      this.addEventListener(errorClose, 'click', () => {
        this.hideModal(errorModal);
      });
    }

    if (successClose) {
      this.addEventListener(successClose, 'click', () => {
        this.hideModal(successModal);
      });
    }

    if (errorOk) {
      this.addEventListener(errorOk, 'click', () => {
        this.hideModal(errorModal);
      });
    }

    if (successOk) {
      this.addEventListener(successOk, 'click', () => {
        this.hideModal(successModal);
      });
    }

    // Close modal on backdrop click
    [errorModal, successModal].forEach(modal => {
      if (modal) {
        this.addEventListener(modal, 'click', (e) => {
          if (e.target === modal) {
            this.hideModal(modal);
          }
        });
      }
    });
  }

  /**
   * Show error modal
   */
  private showErrorModal(message: string, details?: string): void {
    const errorModal = this.elements['error-modal'];
    const errorMessage = this.elements['error-message'];
    
    if (errorMessage) {
      errorMessage.textContent = message;
      if (details) {
        errorMessage.textContent += `\n\n詳細: ${details}`;
      }
    }
    
    this.showModal(errorModal);
  }

  /**
   * Show success modal
   */
  private showSuccessModal(message: string): void {
    const successModal = this.elements['success-modal'];
    const successMessage = this.elements['success-message'];
    
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
      modal.classList.add('active');
    }
  }

  /**
   * Hide modal
   */
  private hideModal(modal: HTMLElement): void {
    if (modal) {
      modal.classList.remove('active');
    }
  }

  /**
   * Reset progress bar
   */
  private resetProgressBar(): void {
    const progressBar = this.elements['progress-fill'];
    const progressText = this.elements['processing-text'];
    
    if (progressBar) {
      progressBar.style.width = '0%';
    }
    
    if (progressText) {
      if (this.i18nService) {
        progressText.textContent = this.i18nService.t('processing.preparing');
      } else {
        progressText.textContent = '準備中...';
      }
    }
  }

  /**
   * Clear results grid
   */
  private clearResultsGrid(): void {
    const resultsGrid = this.elements['results-grid'];
    
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
      listener => listener.element === element && 
                 listener.event === event && 
                 listener.handler === handler
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