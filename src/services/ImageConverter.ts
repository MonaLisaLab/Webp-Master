import {
  FileInfo,
  ConversionResult,
  ConversionConfig,
  ProgressInfo,
  ConversionError,
  ConversionStatus,
  ProcessingStage,
  ErrorType,
  EventCallback,
  EventSubscription,
  DEFAULT_CONVERSION_CONFIG
} from '@/types';
import { IImageConverter } from '@/types/interfaces';

/**
 * ImageConverter class - Single Responsibility Principle
 * Handles image conversion using Canvas API
 */
export class ImageConverter implements IImageConverter {
  private readonly progressCallbacks: EventCallback<ProgressInfo>[] = [];
  private readonly completeCallbacks: EventCallback<ConversionResult>[] = [];
  private readonly errorCallbacks: EventCallback<ConversionError>[] = [];
  private activeConversions: Map<string, AbortController> = new Map();
  private isDisposed = false;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 2D context is not supported');
    }
    this.ctx = context;
    this.checkWebPSupport();
  }

  /**
   * Convert a single file to WebP
   */
  public async convertToWebP(
    file: FileInfo,
    config: ConversionConfig = DEFAULT_CONVERSION_CONFIG
  ): Promise<ConversionResult> {
    this.ensureNotDisposed();
    
    const conversionId = this.generateId();
    const abortController = new AbortController();
    this.activeConversions.set(conversionId, abortController);

    try {
      const startTime = Date.now();
      
      // Step 1: Read file
      this.reportProgress({
        id: conversionId,
        fileName: file.name,
        progress: 0,
        stage: ProcessingStage.READING,
        message: 'ファイルを読み込み中... 📖'
      });

      const imageData = await this.readFileAsImage(file.file);
      this.checkAborted(abortController);

      // Step 2: Process image
      this.reportProgress({
        id: conversionId,
        fileName: file.name,
        progress: 25,
        stage: ProcessingStage.PROCESSING,
        message: '画像を処理中... 🎨'
      });

      const processedImage = await this.processImage(imageData);
      this.checkAborted(abortController);

      // Step 3: Convert to WebP
      this.reportProgress({
        id: conversionId,
        fileName: file.name,
        progress: 50,
        stage: ProcessingStage.CONVERTING,
        message: 'WebP形式に変換中... 🔄'
      });

      const webpBlob = await this.convertToWebPBlob(processedImage, config);
      this.checkAborted(abortController);

      // Step 4: Finalize
      this.reportProgress({
        id: conversionId,
        fileName: file.name,
        progress: 100,
        stage: ProcessingStage.FINALIZING,
        message: '変換完了！ ✅'
      });

      const processingTime = Date.now() - startTime;
      const originalUrl = URL.createObjectURL(file.file);
      const convertedUrl = URL.createObjectURL(webpBlob);

      const result: ConversionResult = {
        id: conversionId,
        originalFile: file,
        convertedBlob: webpBlob,
        convertedSize: webpBlob.size,
        compressionRatio: this.calculateCompressionRatio(file.size, webpBlob.size),
        originalUrl,
        convertedUrl,
        processingTime,
        status: ConversionStatus.COMPLETED
      };

      this.activeConversions.delete(conversionId);
      this.notifyConversionComplete(result);
      
      return result;

    } catch (error) {
      this.activeConversions.delete(conversionId);
      const conversionError = this.createConversionError(conversionId, file.name, error);
      this.notifyConversionError(conversionError);
      throw conversionError;
    }
  }

  /**
   * Convert multiple files to WebP
   */
  public async convertMultiple(
    files: FileInfo[],
    config: ConversionConfig = DEFAULT_CONVERSION_CONFIG
  ): Promise<ConversionResult[]> {
    this.ensureNotDisposed();
    
    const results: ConversionResult[] = [];
    const maxConcurrent = config.maxConcurrentConversions;
    
    // Process files in batches
    for (let i = 0; i < files.length; i += maxConcurrent) {
      const batch = files.slice(i, i + maxConcurrent);
      const batchPromises = batch.map(file => this.convertToWebP(file, config));
      
      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      } catch (error) {
        // Continue processing even if some conversions fail
        console.error('Batch conversion error:', error);
      }
    }

    return results;
  }

  /**
   * Subscribe to conversion progress events
   */
  public onConversionProgress(callback: EventCallback<ProgressInfo>): EventSubscription {
    this.ensureNotDisposed();
    this.progressCallbacks.push(callback);
    
    return {
      unsubscribe: () => {
        const index = this.progressCallbacks.indexOf(callback);
        if (index > -1) {
          this.progressCallbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * Subscribe to conversion complete events
   */
  public onConversionComplete(callback: EventCallback<ConversionResult>): EventSubscription {
    this.ensureNotDisposed();
    this.completeCallbacks.push(callback);
    
    return {
      unsubscribe: () => {
        const index = this.completeCallbacks.indexOf(callback);
        if (index > -1) {
          this.completeCallbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * Subscribe to conversion error events
   */
  public onConversionError(callback: EventCallback<ConversionError>): EventSubscription {
    this.ensureNotDisposed();
    this.errorCallbacks.push(callback);
    
    return {
      unsubscribe: () => {
        const index = this.errorCallbacks.indexOf(callback);
        if (index > -1) {
          this.errorCallbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * Cancel a specific conversion
   */
  public cancelConversion(id: string): void {
    this.ensureNotDisposed();
    const abortController = this.activeConversions.get(id);
    if (abortController) {
      abortController.abort();
      this.activeConversions.delete(id);
    }
  }

  /**
   * Cancel all active conversions
   */
  public cancelAllConversions(): void {
    this.ensureNotDisposed();
    this.activeConversions.forEach((controller) => {
      controller.abort();
    });
    this.activeConversions.clear();
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    if (this.isDisposed) return;
    
    this.cancelAllConversions();
    this.progressCallbacks.length = 0;
    this.completeCallbacks.length = 0;
    this.errorCallbacks.length = 0;
    this.isDisposed = true;
  }

  // ===== Private Methods =====

  /**
   * Check WebP support
   */
  private checkWebPSupport(): void {
    const testCanvas = document.createElement('canvas');
    testCanvas.width = 1;
    testCanvas.height = 1;
    
    const supported = testCanvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    
    if (!supported) {
      throw new Error('WebP format is not supported in this browser');
    }
  }

  /**
   * Read file as image
   */
  private async readFileAsImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      const img = new Image();
      
      reader.onload = (e) => {
        if (!e.target?.result) {
          reject(new Error('Failed to read file'));
          return;
        }
        
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target.result as string;
      };
      
      reader.onerror = () => reject(new Error('FileReader error'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Process image (resize, optimize, etc.)
   */
  private async processImage(image: HTMLImageElement): Promise<HTMLImageElement> {
    // For now, return the image as-is
    // Future enhancements: resize, optimize, apply filters
    return image;
  }

  /**
   * Convert image to WebP blob
   */
  private async convertToWebPBlob(
    image: HTMLImageElement,
    config: ConversionConfig
  ): Promise<Blob> {
    // Set canvas size
    this.canvas.width = image.naturalWidth;
    this.canvas.height = image.naturalHeight;

    // Draw image on canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(image, 0, 0);

    // Convert to WebP blob
    return new Promise((resolve, reject) => {
      this.canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to convert image to WebP'));
          }
        },
        'image/webp',
        config.quality
      );
    });
  }

  /**
   * Calculate compression ratio
   */
  private calculateCompressionRatio(originalSize: number, convertedSize: number): number {
    if (originalSize === 0) return 0;
    return Math.round(((originalSize - convertedSize) / originalSize) * 100);
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Check if conversion was aborted
   */
  private checkAborted(controller: AbortController): void {
    if (controller.signal.aborted) {
      throw new Error('Conversion was cancelled');
    }
  }

  /**
   * Create conversion error
   */
  private createConversionError(
    id: string,
    fileName: string,
    error: unknown
  ): ConversionError {
    let errorType = ErrorType.UNKNOWN_ERROR;
    let message = 'Unknown error occurred';

    if (error instanceof Error) {
      message = error.message;
      if (message.includes('cancelled')) {
        errorType = ErrorType.PROCESSING_ERROR;
        message = '変換がキャンセルされました 🚫';
      } else if (message.includes('WebP')) {
        errorType = ErrorType.BROWSER_COMPATIBILITY;
        message = 'WebP形式がサポートされていません 🚫';
      } else if (message.includes('size') || message.includes('large')) {
        errorType = ErrorType.FILE_TOO_LARGE;
        message = 'ファイルサイズが大きすぎます 📏';
      } else {
        errorType = ErrorType.PROCESSING_ERROR;
        message = `処理中にエラーが発生しました: ${message} ⚠️`;
      }
    }

    return {
      id,
      fileName,
      errorType,
      message,
      details: String(error),
      timestamp: Date.now()
    };
  }

  /**
   * Report progress
   */
  private reportProgress(progress: ProgressInfo): void {
    this.progressCallbacks.forEach(callback => {
      try {
        callback(progress);
      } catch (error) {
        console.error('Error in progress callback:', error);
      }
    });
  }

  /**
   * Notify conversion complete
   */
  private notifyConversionComplete(result: ConversionResult): void {
    this.completeCallbacks.forEach(callback => {
      try {
        callback(result);
      } catch (error) {
        console.error('Error in completion callback:', error);
      }
    });
  }

  /**
   * Notify conversion error
   */
  private notifyConversionError(error: ConversionError): void {
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error);
      } catch (error) {
        console.error('Error in error callback:', error);
      }
    });
  }

  /**
   * Ensure the instance is not disposed
   */
  private ensureNotDisposed(): void {
    if (this.isDisposed) {
      throw new Error('ImageConverter has been disposed');
    }
  }
} 