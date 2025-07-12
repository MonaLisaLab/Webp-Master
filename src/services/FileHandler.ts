import {
  FileInfo,
  ValidationResult,
  EventCallback,
  EventSubscription,
  SUPPORTED_FORMATS,
  MAX_FILE_SIZE_MB,
  MAX_FILES_PER_BATCH,
  ErrorType,
  ConversionError
} from '@/types';
import { IFileHandler } from '@/types/interfaces';

/**
 * FileHandler class - Single Responsibility Principle
 * Handles file operations: acceptance, validation, and processing
 */
export class FileHandler implements IFileHandler {
  private readonly fileSelectedCallbacks: EventCallback<FileInfo[]>[] = [];
  private selectedFiles: FileInfo[] = [];
  private isDisposed = false;

  constructor() {
    this.bindEvents();
  }

  /**
   * Accept files from FileList or File array
   */
  public async acceptFiles(files: FileList | File[]): Promise<FileInfo[]> {
    this.ensureNotDisposed();
    
    const fileArray = Array.from(files);
    const fileInfos: FileInfo[] = [];

    for (const file of fileArray) {
      const fileInfo: FileInfo = {
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      };
      fileInfos.push(fileInfo);
    }

    return fileInfos;
  }

  /**
   * Validate files according to business rules
   */
  public validateFiles(files: FileInfo[]): ValidationResult {
    this.ensureNotDisposed();
    
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check file count
    if (files.length === 0) {
      errors.push('ファイルが選択されていません 🚫');
    }

    if (files.length > MAX_FILES_PER_BATCH) {
      errors.push(`一度に処理できるファイル数は${MAX_FILES_PER_BATCH}個までです 📝`);
    }

    // Validate each file
    for (const fileInfo of files) {
      const fileValidation = this.validateSingleFile(fileInfo);
      errors.push(...fileValidation.errors);
      warnings.push(...fileValidation.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Process file selection and notify listeners
   */
  public async processFileSelection(files: FileInfo[]): Promise<void> {
    this.ensureNotDisposed();
    
    const validation = this.validateFiles(files);
    
    if (!validation.isValid) {
      const error: ConversionError = {
        id: this.generateId(),
        fileName: 'Multiple files',
        errorType: ErrorType.UNSUPPORTED_FORMAT,
        message: validation.errors.join(', '),
        details: validation.warnings.join(', '),
        timestamp: Date.now()
      };
      throw error;
    }

    this.selectedFiles = files;
    this.notifyFileSelected(files);
  }

  /**
   * Subscribe to file selection events
   */
  public onFilesSelected(callback: EventCallback<FileInfo[]>): EventSubscription {
    this.ensureNotDisposed();
    
    this.fileSelectedCallbacks.push(callback);
    
    return {
      unsubscribe: () => {
        const index = this.fileSelectedCallbacks.indexOf(callback);
        if (index > -1) {
          this.fileSelectedCallbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * Clear selected files
   */
  public clearSelectedFiles(): void {
    this.ensureNotDisposed();
    this.selectedFiles = [];
  }

  /**
   * Get currently selected files
   */
  public getSelectedFiles(): FileInfo[] {
    this.ensureNotDisposed();
    return [...this.selectedFiles];
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    if (this.isDisposed) return;
    
    this.fileSelectedCallbacks.length = 0;
    this.selectedFiles = [];
    this.isDisposed = true;
  }

  // ===== Private Methods =====

  /**
   * Validate a single file
   */
  private validateSingleFile(fileInfo: FileInfo): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check file type
    if (!SUPPORTED_FORMATS.includes(fileInfo.type as any)) {
      errors.push(`${fileInfo.name}: サポートされていないファイル形式です（${fileInfo.type}）🚫`);
    }

    // Check file size
    const maxSizeBytes = MAX_FILE_SIZE_MB * 1024 * 1024;
    if (fileInfo.size > maxSizeBytes) {
      errors.push(`${fileInfo.name}: ファイルサイズが大きすぎます（${this.formatFileSize(fileInfo.size)} > ${MAX_FILE_SIZE_MB}MB）📏`);
    }

    // Check for empty files
    if (fileInfo.size === 0) {
      errors.push(`${fileInfo.name}: ファイルが空です 📄`);
    }

    // Warning for large files
    const warningThreshold = 5 * 1024 * 1024; // 5MB
    if (fileInfo.size > warningThreshold) {
      warnings.push(`${fileInfo.name}: 大きなファイルです（${this.formatFileSize(fileInfo.size)}）。処理に時間がかかる可能性があります ⚠️`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
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
   * Generate unique ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Notify listeners about file selection
   */
  private notifyFileSelected(files: FileInfo[]): void {
    this.fileSelectedCallbacks.forEach(callback => {
      try {
        callback(files);
      } catch (error) {
        console.error('Error in file selection callback:', error);
      }
    });
  }

  /**
   * Bind DOM events
   */
  private bindEvents(): void {
    // This method can be used to bind additional events if needed
    // For example, global drag and drop events
  }

  /**
   * Ensure the instance is not disposed
   */
  private ensureNotDisposed(): void {
    if (this.isDisposed) {
      throw new Error('FileHandler has been disposed');
    }
  }
} 