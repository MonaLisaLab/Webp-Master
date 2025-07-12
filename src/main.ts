import { Application } from './Application';
import { DEFAULT_CONVERSION_CONFIG } from '@/types';

/**
 * WebP Master Application Entry Point
 * 🖼️ Modern WebP conversion service - Convert PNG/JPEG to WebP format client-side
 */

// Application instance
let app: Application | null = null;

/**
 * Initialize and start the application
 */
async function initializeApp(): Promise<void> {
  try {
    console.log('🚀 WebP Master を初期化しています...');
    
    // Check browser compatibility
    if (!checkBrowserCompatibility()) {
      showCompatibilityError();
      return;
    }
    
    // Create application instance
    app = new Application(DEFAULT_CONVERSION_CONFIG);
    
    // Initialize application
    await app.initialize();
    
    // Start application
    app.start();
    
    console.log('✨ WebP Master が正常に起動しました！');
    
  } catch (error) {
    console.error('❌ アプリケーションの起動に失敗しました:', error);
    showInitializationError(error);
  }
}

/**
 * Check browser compatibility
 */
function checkBrowserCompatibility(): boolean {
  const checks = {
    canvas: !!document.createElement('canvas').getContext,
    fileApi: !!(window.File && window.FileReader && window.FileList && window.Blob),
    webp: checkWebPSupport(),
    dragDrop: 'draggable' in document.createElement('div'),
    downloadAttribute: 'download' in document.createElement('a')
  };
  
  console.log('🔍 ブラウザ互換性チェック:', checks);
  
  const unsupportedFeatures = Object.entries(checks)
    .filter(([, supported]) => !supported)
    .map(([feature]) => feature);
  
  if (unsupportedFeatures.length > 0) {
    console.warn('⚠️ 一部機能がサポートされていません:', unsupportedFeatures);
  }
  
  // WebP and Canvas are critical
  return checks.webp && checks.canvas && checks.fileApi;
}

/**
 * Check WebP support
 */
function checkWebPSupport(): boolean {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
}

/**
 * Show compatibility error
 */
function showCompatibilityError(): void {
  const errorHtml = `
    <div style="
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #fff;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      text-align: center;
      max-width: 500px;
      z-index: 10000;
    ">
      <h2 style="color: #e53e3e; margin-bottom: 1rem;">⚠️ ブラウザ非対応</h2>
      <p style="margin-bottom: 1rem; line-height: 1.6;">
        お使いのブラウザはWebP Master に必要な機能をサポートしていません。
      </p>
      <p style="margin-bottom: 1.5rem; font-size: 0.9rem; color: #666;">
        対応ブラウザ: Chrome, Firefox, Edge, Safari の最新版
      </p>
      <button onclick="window.location.reload()" style="
        background: #667eea;
        color: white;
        border: none;
        padding: 0.8rem 1.5rem;
        border-radius: 8px;
        cursor: pointer;
        font-size: 1rem;
      ">
        🔄 再読み込み
      </button>
    </div>
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      z-index: 9999;
    "></div>
  `;
  
  document.body.insertAdjacentHTML('afterbegin', errorHtml);
}

/**
 * Show initialization error
 */
function showInitializationError(error: unknown): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  const errorHtml = `
    <div style="
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #fff;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      text-align: center;
      max-width: 500px;
      z-index: 10000;
    ">
      <h2 style="color: #e53e3e; margin-bottom: 1rem;">❌ 初期化エラー</h2>
      <p style="margin-bottom: 1rem; line-height: 1.6;">
        アプリケーションの初期化中にエラーが発生しました。
      </p>
      <details style="margin-bottom: 1.5rem; text-align: left;">
        <summary style="cursor: pointer; color: #666;">エラー詳細</summary>
        <pre style="
          background: #f5f5f5;
          padding: 1rem;
          border-radius: 4px;
          font-size: 0.8rem;
          overflow-x: auto;
          margin-top: 0.5rem;
        ">${errorMessage}</pre>
      </details>
      <button onclick="window.location.reload()" style="
        background: #667eea;
        color: white;
        border: none;
        padding: 0.8rem 1.5rem;
        border-radius: 8px;
        cursor: pointer;
        font-size: 1rem;
      ">
        🔄 再読み込み
      </button>
    </div>
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      z-index: 9999;
    "></div>
  `;
  
  document.body.insertAdjacentHTML('afterbegin', errorHtml);
}

/**
 * Handle page unload
 */
function handlePageUnload(): void {
  if (app) {
    console.log('🧹 アプリケーションをクリーンアップしています...');
    app.dispose();
    app = null;
  }
}

/**
 * Handle uncaught errors
 */
function handleUncaughtError(event: ErrorEvent): void {
  console.error('💥 予期しないエラーが発生しました:', event.error);
  
  // Show user-friendly error message
  const toast = document.createElement('div');
  toast.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      background: #fed7d7;
      color: #c53030;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      border: 1px solid #feb2b2;
      z-index: 10000;
      font-size: 0.9rem;
      max-width: 400px;
    ">
      ⚠️ 予期しないエラーが発生しました。ページを再読み込みしてください。
    </div>
  `;
  
  document.body.appendChild(toast);
  
  // Auto-remove toast after 5 seconds
  setTimeout(() => {
    if (document.body.contains(toast)) {
      document.body.removeChild(toast);
    }
  }, 5000);
}

/**
 * Handle unhandled promise rejections
 */
function handleUnhandledRejection(event: PromiseRejectionEvent): void {
  console.error('💥 未処理のPromise拒否:', event.reason);
  
  // Show user-friendly error message
  const toast = document.createElement('div');
  toast.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      background: #fed7d7;
      color: #c53030;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      border: 1px solid #feb2b2;
      z-index: 10000;
      font-size: 0.9rem;
      max-width: 400px;
    ">
      ⚠️ 処理中にエラーが発生しました。操作を再試行してください。
    </div>
  `;
  
  document.body.appendChild(toast);
  
  // Auto-remove toast after 5 seconds
  setTimeout(() => {
    if (document.body.contains(toast)) {
      document.body.removeChild(toast);
    }
  }, 5000);
}

// ===== Event Listeners =====

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('📄 DOM読み込み完了');
  initializeApp();
});

// Page Unload
window.addEventListener('beforeunload', handlePageUnload);

// Error Handling
window.addEventListener('error', handleUncaughtError);
window.addEventListener('unhandledrejection', handleUnhandledRejection);

// Development Hot Reload (Vite)
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    console.log('🔄 Hot Reload: クリーンアップ中...');
    if (app) {
      app.dispose();
      app = null;
    }
  });
}

// ===== Export for debugging =====
if (typeof window !== 'undefined') {
  // @ts-ignore - For debugging purposes
  window.webpMaster = {
    app: () => app,
    stats: () => app?.getStats(),
    reset: () => app?.reset(),
    version: '1.0.0'
  };
}

console.log('🖼️ WebP Master v1.0.0 - Ready to convert images!'); 