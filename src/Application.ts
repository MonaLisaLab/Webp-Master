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

/**
 * Main Application class
 * Coordinates all services and manages the application lifecycle
 */
export class Application implements IApplication {
  private readonly fileHandler: FileHandler;
  private readonly imageConverter: ImageConverter;
  private readonly uiController: UIController;
  private readonly previewManager: PreviewManager;
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
  }

  /**
   * Initialize the application
   */
  public async initialize(): Promise<void> {
    this.ensureNotDisposed();
    
    try {
      // Initialize UI
      this.uiController.initialize();
      
      // Setup event subscriptions
      this.setupEventSubscriptions();
      
      // Setup UI event handlers
      this.setupUIEventHandlers();
      
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
    
    // Show initial UI state
    this.uiController.displaySuccess('WebP Master へようこそ！画像をアップロードして変換を開始しましょう！ 🎉');
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
   * Display conversion results
   */
  private displayResults(results: ConversionResult[]): void {
    if (results.length === 0) {
      this.uiController.displayError({
        id: 'no-results',
        fileName: 'No results',
        errorType: 'processing_error' as any,
        message: '変換された画像がありません',
        timestamp: Date.now()
      });
      return;
    }

    // Show results section
    this.uiController.showResultsSection();
    
    // Display previews
    this.previewManager.displayResults(results);
    
    // Show success message
    const successMessage = results.length === 1 
      ? '1つの画像が正常に変換されました！ 🎉'
      : `${results.length}個の画像が正常に変換されました！ 🎉`;
    
    this.uiController.displaySuccess(successMessage);
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