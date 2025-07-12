import {
  FileInfo,
  ConversionResult,
  ConversionConfig,
  ProgressInfo,
  ConversionError,
  EventCallback,
  EventSubscription,
  ValidationResult,
  BrowserCapabilities,
  ConversionStats,
  Disposable
} from './index';

// ===== Interface Segregation Principle (ISP) =====

// File reading interface
export interface IFileReader {
  readFile(file: File): Promise<ArrayBuffer>;
  readFileAsDataURL(file: File): Promise<string>;
  validateFile(file: File): ValidationResult;
}

// Image processing interface  
export interface IImageProcessor {
  processImage(imageData: ArrayBuffer, config: ConversionConfig): Promise<Blob>;
  createImageFromData(data: ArrayBuffer): Promise<HTMLImageElement>;
  getImageDimensions(image: HTMLImageElement): { width: number; height: number };
}

// Progress reporting interface
export interface IProgressReporter {
  reportProgress(progress: ProgressInfo): void;
  onProgress(callback: EventCallback<ProgressInfo>): EventSubscription;
  clearProgress(): void;
}

// Error handling interface
export interface IErrorHandler {
  handleError(error: ConversionError): void;
  onError(callback: EventCallback<ConversionError>): EventSubscription;
  clearErrors(): void;
}

// Event system interface
export interface IEventEmitter<T> {
  on(event: string, callback: EventCallback<T>): EventSubscription;
  emit(event: string, data: T): void;
  off(event: string, callback: EventCallback<T>): void;
}

// Storage interface
export interface IStorage {
  store(key: string, data: any): void;
  retrieve(key: string): any;
  remove(key: string): void;
  clear(): void;
}

// ===== Core Service Interfaces =====

// File Handler Interface (Single Responsibility)
export interface IFileHandler extends Disposable {
  acceptFiles(files: FileList | File[]): Promise<FileInfo[]>;
  validateFiles(files: FileInfo[]): ValidationResult;
  processFileSelection(files: FileInfo[]): Promise<void>;
  onFilesSelected(callback: EventCallback<FileInfo[]>): EventSubscription;
  clearSelectedFiles(): void;
}

// Image Converter Interface (Single Responsibility)
export interface IImageConverter extends Disposable {
  convertToWebP(file: FileInfo, config: ConversionConfig): Promise<ConversionResult>;
  convertMultiple(files: FileInfo[], config: ConversionConfig): Promise<ConversionResult[]>;
  onConversionProgress(callback: EventCallback<ProgressInfo>): EventSubscription;
  onConversionComplete(callback: EventCallback<ConversionResult>): EventSubscription;
  onConversionError(callback: EventCallback<ConversionError>): EventSubscription;
  cancelConversion(id: string): void;
  cancelAllConversions(): void;
}

// UI Controller Interface (Single Responsibility)
export interface IUIController extends Disposable {
  initialize(): void;
  showUploadArea(): void;
  hideUploadArea(): void;
  showProcessingSection(): void;
  hideProcessingSection(): void;
  showResultsSection(): void;
  hideResultsSection(): void;
  updateProgress(progress: ProgressInfo): void;
  displayError(error: ConversionError): void;
  displaySuccess(message: string): void;
  clearUI(): void;
}

// Preview Manager Interface (Single Responsibility)
export interface IPreviewManager extends Disposable {
  generatePreview(result: ConversionResult): Promise<HTMLElement>;
  displayResults(results: ConversionResult[]): void;
  clearPreviews(): void;
  downloadFile(result: ConversionResult): void;
  downloadAll(results: ConversionResult[]): void;
  onDownloadRequest(callback: EventCallback<ConversionResult>): EventSubscription;
}

// ===== Dependency Injection Interfaces =====

// Main Application Interface
export interface IApplication extends Disposable {
  initialize(): Promise<void>;
  start(): void;
  stop(): void;
  getStats(): ConversionStats;
  reset(): void;
}

// Service Container Interface
export interface IServiceContainer {
  register<T>(token: string, implementation: T): void;
  resolve<T>(token: string): T;
  has(token: string): boolean;
}

// Configuration Service Interface
export interface IConfigurationService {
  getConversionConfig(): ConversionConfig;
  setConversionConfig(config: Partial<ConversionConfig>): void;
  resetToDefaults(): void;
}

// Browser Compatibility Service Interface
export interface IBrowserCompatibilityService {
  checkCompatibility(): BrowserCapabilities;
  isWebPSupported(): boolean;
  isCanvasSupported(): boolean;
  isFileAPISupported(): boolean;
  requiresPolyfill(): boolean;
}

// Analytics Service Interface
export interface IAnalyticsService {
  trackConversion(result: ConversionResult): void;
  trackError(error: ConversionError): void;
  getStatistics(): ConversionStats;
  reset(): void;
}

// ===== Factory Interfaces =====

// Converter Factory Interface (Open/Closed Principle)
export interface IConverterFactory {
  createConverter(format: string): IImageConverter;
  getSupportedFormats(): string[];
  registerConverter(format: string, converter: IImageConverter): void;
}

// UI Component Factory Interface
export interface IUIComponentFactory {
  createUploadArea(): HTMLElement;
  createProgressBar(): HTMLElement;
  createResultCard(result: ConversionResult): HTMLElement;
  createErrorModal(error: ConversionError): HTMLElement;
}

// ===== Validation Interfaces =====

// File Validator Interface
export interface IFileValidator {
  validateFile(file: File): ValidationResult;
  validateBatch(files: File[]): ValidationResult;
  addValidationRule(rule: (file: File) => ValidationResult): void;
}

// ===== Service Tokens for Dependency Injection =====
export const SERVICE_TOKENS = {
  FILE_HANDLER: 'FileHandler',
  IMAGE_CONVERTER: 'ImageConverter',
  UI_CONTROLLER: 'UIController',
  PREVIEW_MANAGER: 'PreviewManager',
  CONFIGURATION_SERVICE: 'ConfigurationService',
  BROWSER_COMPATIBILITY_SERVICE: 'BrowserCompatibilityService',
  ANALYTICS_SERVICE: 'AnalyticsService',
  FILE_VALIDATOR: 'FileValidator',
  CONVERTER_FACTORY: 'ConverterFactory',
  UI_COMPONENT_FACTORY: 'UIComponentFactory'
} as const;

export type ServiceToken = typeof SERVICE_TOKENS[keyof typeof SERVICE_TOKENS]; 