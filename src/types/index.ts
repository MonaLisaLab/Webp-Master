// ===== File Types =====
export interface FileInfo {
  file: File;
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

export interface ConversionResult {
  id: string;
  originalFile: FileInfo;
  convertedBlob: Blob;
  convertedSize: number;
  compressionRatio: number;
  originalUrl: string;
  convertedUrl: string;
  processingTime: number;
  status: ConversionStatus;
  error?: string;
}

export enum ConversionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export enum SupportedFormat {
  PNG = 'image/png',
  JPEG = 'image/jpeg',
  JPG = 'image/jpg'
}

// ===== Configuration Types =====
export interface ConversionConfig {
  quality: number; // 0.0 to 1.0
  format: 'webp';
  enableProgressReporting: boolean;
  maxFileSize: number; // in bytes
  maxConcurrentConversions: number;
}

export interface UIConfig {
  showFileSize: boolean;
  showCompressionRatio: boolean;
  showProcessingTime: boolean;
  enableAnimations: boolean;
  theme: 'light' | 'dark';
}

// ===== Progress Types =====
export interface ProgressInfo {
  id: string;
  fileName: string;
  progress: number; // 0 to 100
  stage: ProcessingStage;
  message: string;
  estimatedTimeRemaining?: number;
}

export enum ProcessingStage {
  READING = 'reading',
  PROCESSING = 'processing',
  CONVERTING = 'converting',
  FINALIZING = 'finalizing'
}

// ===== Error Types =====
export interface ConversionError {
  id: string;
  fileName: string;
  errorType: ErrorType;
  message: string;
  details?: string;
  timestamp: number;
}

export enum ErrorType {
  UNSUPPORTED_FORMAT = 'unsupported_format',
  FILE_TOO_LARGE = 'file_too_large',
  PROCESSING_ERROR = 'processing_error',
  BROWSER_COMPATIBILITY = 'browser_compatibility',
  UNKNOWN_ERROR = 'unknown_error'
}

// ===== Event Types =====
export interface FileUploadEvent {
  files: FileInfo[];
  timestamp: number;
}

export interface ConversionStartEvent {
  fileIds: string[];
  timestamp: number;
}

export interface ConversionCompleteEvent {
  results: ConversionResult[];
  timestamp: number;
}

export interface ConversionErrorEvent {
  error: ConversionError;
  timestamp: number;
}

// ===== Utility Types =====
export type EventCallback<T> = (event: T) => void;

export interface EventSubscription {
  unsubscribe: () => void;
}

export interface Disposable {
  dispose(): void;
}

// ===== Browser Compatibility =====
export interface BrowserCapabilities {
  supportsWebP: boolean;
  supportsCanvas: boolean;
  supportsFileAPI: boolean;
  supportsDragAndDrop: boolean;
  supportsDownloadAttribute: boolean;
}

// ===== Statistics Types =====
export interface ConversionStats {
  totalFilesProcessed: number;
  totalSizeReduced: number;
  averageCompressionRatio: number;
  averageProcessingTime: number;
  successfulConversions: number;
  failedConversions: number;
}

// ===== Validation Types =====
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface FileValidationRule {
  name: string;
  validate: (file: File) => ValidationResult;
}

// ===== Default Values =====
export const DEFAULT_CONVERSION_CONFIG: ConversionConfig = {
  quality: 0.8,
  format: 'webp',
  enableProgressReporting: true,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxConcurrentConversions: 3
};

export const DEFAULT_UI_CONFIG: UIConfig = {
  showFileSize: true,
  showCompressionRatio: true,
  showProcessingTime: true,
  enableAnimations: true,
  theme: 'light'
};

export const SUPPORTED_FORMATS: SupportedFormat[] = [
  SupportedFormat.PNG,
  SupportedFormat.JPEG,
  SupportedFormat.JPG
];

export const MAX_FILE_SIZE_MB = 10;
export const MAX_FILES_PER_BATCH = 20; 