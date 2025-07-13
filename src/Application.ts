import {
  FileInfo,
  ConversionResult,
  ConversionConfig,
  ProgressInfo,
  ConversionError,
  ConversionStats,
  DEFAULT_CONVERSION_CONFIG,
  EventSubscription
} from '@/types';
import { IApplication } from '@/types/interfaces';
import { FileHandler } from '@/services/FileHandler';
import { ImageConverter } from '@/services/ImageConverter';
import { UIController } from '@/services/UIController';
import { PreviewManager } from '@/services/PreviewManager';
import { I18nService } from '@/services/I18nService';
import { SeoMetaService } from '@/services/SeoMetaService';
import Swal from 'sweetalert2';

/**
 * Main Application class
 * Coordinates all services and manages the application lifecycle with I18n support
 */
export class Application implements IApplication {
  private readonly fileHandler: FileHandler;
  private readonly imageConverter: ImageConverter;
  private readonly uiController: UIController;
  private readonly previewManager: PreviewManager;
  private readonly i18nService: I18nService;
  private readonly seoMetaService: SeoMetaService;
  private readonly subscriptions: EventSubscription[] = [];
  private isDisposed = false;
  private config: ConversionConfig;
  private stats: ConversionStats;

  constructor(config: ConversionConfig = DEFAULT_CONVERSION_CONFIG) {
    this.config = config;
    this.stats = this.initializeStats();
    
    // Initialize services
    this.fileHandler = new FileHandler();
    this.imageConverter = new ImageConverter();
    this.uiController = new UIController();
    this.previewManager = new PreviewManager();
    this.i18nService = new I18nService();
    this.seoMetaService = new SeoMetaService();
  }

  /**
   * Initialize the application
   */
  public async initialize(): Promise<void> {
    this.ensureNotDisposed();
    
    try {
      // Initialize I18n service first
      await this.i18nService.initialize();
      
      // Initialize UI with I18n support
      await this.uiController.initialize(this.i18nService, this.seoMetaService);
      
      // Inject I18n service into preview manager
      this.previewManager.setI18nService(this.i18nService);
      
      // Setup event subscriptions
      this.setupEventSubscriptions();
      
      // Setup UI event handlers
      this.setupUIEventHandlers();
      
      // Initialize SEO meta tags
      this.updateSeoForCurrentLanguage();
      
      console.log('🚀 WebP Master アプリケーションが正常に初期化されました！');
    } catch (error) {
      console.error('❌ アプリケーションの初期化に失敗しました:', error);
      throw error;
    }
  }

  /**
   * Start the application
   */
  public start(): void {
    this.ensureNotDisposed();
    
    console.log('✨ WebP Master アプリケーションが開始されました！');
  }

  /**
   * Stop the application
   */
  public stop(): void {
    this.ensureNotDisposed();
    
    // Cancel all active conversions
    this.imageConverter.cancelAllConversions();
    
    // Clear UI
    this.uiController.clearUI();
    
    console.log('🛑 WebP Master アプリケーションが停止されました');
  }

  /**
   * Get conversion statistics
   */
  public getStats(): ConversionStats {
    this.ensureNotDisposed();
    return { ...this.stats };
  }

  /**
   * Reset application state
   */
  public reset(): void {
    this.ensureNotDisposed();
    
    // Cancel conversions
    this.imageConverter.cancelAllConversions();
    
    // Clear services
    this.fileHandler.clearSelectedFiles();
    this.previewManager.clearPreviews();
    
    // Reset UI
    this.uiController.clearUI();
    
    // Reset stats
    this.stats = this.initializeStats();
    
    console.log('🔄 アプリケーションがリセットされました');
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    if (this.isDisposed) return;
    
    // Unsubscribe from all events
    this.subscriptions.forEach(subscription => {
      subscription.unsubscribe();
    });
    this.subscriptions.length = 0;
    
    // Dispose services
    this.fileHandler.dispose();
    this.imageConverter.dispose();
    this.uiController.dispose();
    this.previewManager.dispose();
    
    this.isDisposed = true;
    console.log('🧹 アプリケーションが正常に破棄されました');
  }

  // ===== Private Methods =====

  /**
   * Initialize statistics
   */
  private initializeStats(): ConversionStats {
    return {
      totalFilesProcessed: 0,
      totalSizeReduced: 0,
      averageCompressionRatio: 0,
      averageProcessingTime: 0,
      successfulConversions: 0,
      failedConversions: 0
    };
  }

  /**
   * Setup event subscriptions
   */
  private setupEventSubscriptions(): void {
    // File selection events
    const fileSelectionSub = this.fileHandler.onFilesSelected((files) => {
      this.handleFilesSelected(files);
    });
    this.subscriptions.push(fileSelectionSub);

    // Conversion progress events
    const progressSub = this.imageConverter.onConversionProgress((progress) => {
      this.handleConversionProgress(progress);
    });
    this.subscriptions.push(progressSub);

    // Conversion complete events
    const completeSub = this.imageConverter.onConversionComplete((result) => {
      this.handleConversionComplete(result);
    });
    this.subscriptions.push(completeSub);

    // Conversion error events
    const errorSub = this.imageConverter.onConversionError((error) => {
      this.handleConversionError(error);
    });
    this.subscriptions.push(errorSub);

    // Download events
    const downloadSub = this.previewManager.onDownloadRequest((result) => {
      this.handleDownloadRequest(result);
    });
    this.subscriptions.push(downloadSub);

    // Language change events
    const languageChangeSub = this.i18nService.onLanguageChange((language) => {
      this.handleLanguageChange(language);
    });
    this.subscriptions.push(languageChangeSub);
  }

  /**
   * Setup UI event handlers
   */
  private setupUIEventHandlers(): void {
    // Drag and drop
    const dragDropSub = this.uiController.setupDragAndDrop((files) => {
      this.handleFileInput(files);
    });
    this.subscriptions.push(dragDropSub);

    // File input
    const fileInputSub = this.uiController.setupFileInput((files) => {
      this.handleFileInput(files);
    });
    this.subscriptions.push(fileInputSub);
  }

  /**
   * Handle file input (drag & drop or file selection)
   */
  private async handleFileInput(files: FileList): Promise<void> {
    try {
      const fileInfos = await this.fileHandler.acceptFiles(files);
      await this.fileHandler.processFileSelection(fileInfos);
    } catch (error) {
      console.error('File input error:', error);
      if (error instanceof Object && 'message' in error) {
        this.uiController.displayError(error as ConversionError);
      }
    }
  }

  /**
   * Handle files selected event
   */
  private async handleFilesSelected(files: FileInfo[]): Promise<void> {
    try {
      console.log(`📁 ${files.length} 個のファイルが選択されました`);
      
      // Show processing section
      this.uiController.showProcessingSection();
      
      // Start conversion
      const results = await this.imageConverter.convertMultiple(files, this.config);
      
      // Hide processing section
      this.uiController.hideProcessingSection();
      
      // Show results
      this.displayResults(results);
      
    } catch (error) {
      console.error('Files selected error:', error);
      this.uiController.hideProcessingSection();
      this.uiController.displayError({
        id: 'batch-error',
        fileName: 'Batch processing',
        errorType: 'processing_error' as any,
        message: 'ファイルの処理中にエラーが発生しました',
        details: String(error),
        timestamp: Date.now()
      });
    }
  }

  /**
   * Handle conversion progress
   */
  private handleConversionProgress(progress: ProgressInfo): void {
    this.uiController.updateProgress(progress);
  }

  /**
   * Handle conversion complete
   */
  private handleConversionComplete(result: ConversionResult): void {
    // Update statistics
    this.updateStats(result);
    
    console.log(`✅ 変換完了: ${result.originalFile.name}`);
  }

  /**
   * Handle conversion error
   */
  private handleConversionError(error: ConversionError): void {
    this.stats.failedConversions++;
    this.uiController.displayError(error);
    
    console.error(`❌ 変換エラー: ${error.fileName}`, error);
  }

  /**
   * Handle download request
   */
  private handleDownloadRequest(result: ConversionResult): void {
    console.log(`📥 ダウンロード: ${result.originalFile.name}`);
  }

  /**
   * Handle language change
   */
  private handleLanguageChange(language: string): void {
    console.log(`🌏 言語が変更されました: ${language}`);
    this.updateSeoForCurrentLanguage();
  }

  /**
   * Update SEO meta tags for current language
   */
  private updateSeoForCurrentLanguage(): void {
    this.seoMetaService.updateForLanguage(this.i18nService.getCurrentLanguage(), {
      title: this.i18nService.t('meta.title'),
      description: this.i18nService.t('meta.description'),
      keywords: this.i18nService.t('meta.keywords'),
      ogp: {
        title: this.i18nService.t('ogp.title'),
        description: this.i18nService.t('ogp.description'),
        siteName: this.i18nService.t('ogp.siteName'),
        imageAlt: this.i18nService.t('ogp.imageAlt')
      }
    });
  }

  /**
   * Display conversion results
   */
  private displayResults(results: ConversionResult[]): void {
    if (results.length === 0) {
      this.uiController.displayError({
        id: 'no-results',
        fileName: 'No results',
        errorType: 'processing_error' as any,
        message: this.i18nService.t('errors.noFilesSelected'),
        timestamp: Date.now()
      });
      return;
    }

    // Show results section
    this.uiController.showResultsSection();
    
    // Display previews
    this.previewManager.displayResults(results);
    
    // Show success toast
    const successMessage = results.length === 1 
      ? this.i18nService.t('success.singleFile')
      : this.i18nService.t('success.multipleFiles', { count: results.length.toString() });
    
    Swal.fire({
      icon: 'success',
      title: this.i18nService.t('success.title'),
      text: successMessage,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      background: '#f8f9fa',
      color: '#28a745',
      iconColor: '#28a745'
    });
  }

  /**
   * Update statistics
   */
  private updateStats(result: ConversionResult): void {
    this.stats.totalFilesProcessed++;
    this.stats.successfulConversions++;
    
    const sizeReduction = result.originalFile.size - result.convertedSize;
    this.stats.totalSizeReduced += sizeReduction;
    
    // Update average compression ratio
    this.stats.averageCompressionRatio = 
      (this.stats.averageCompressionRatio * (this.stats.successfulConversions - 1) + result.compressionRatio) / 
      this.stats.successfulConversions;
    
    // Update average processing time
    this.stats.averageProcessingTime = 
      (this.stats.averageProcessingTime * (this.stats.successfulConversions - 1) + result.processingTime) / 
      this.stats.successfulConversions;
  }

  /**
   * Ensure the instance is not disposed
   */
  private ensureNotDisposed(): void {
    if (this.isDisposed) {
      throw new Error('Application has been disposed');
    }
  }
} 