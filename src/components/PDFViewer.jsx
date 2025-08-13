import React, { useState, useEffect, useRef } from 'react';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import Tiff from 'tiff.js';
import mammoth from 'mammoth/mammoth.browser';

// PDF.js worker ayarı (yerel worker)
GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const FileViewer = ({ fileUrl, fileName, fileType }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tiffData, setTiffData] = useState(null);
  const canvasRef = useRef(null);

  // Dosya tipini belirle
  const normalizedFileType = fileType?.toLowerCase() || '';
  const isPDF = normalizedFileType === 'pdf';
  const isDOCX = normalizedFileType === 'docx';
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(normalizedFileType);
  const isTIFF = ['tiff', 'tif'].includes(normalizedFileType);

  // PDF states
  const pdfCanvasRef = useRef(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [currentRenderTask, setCurrentRenderTask] = useState(null);
  const isRenderingRef = useRef(false);
  const queuedRenderRef = useRef(null);

  // PDF yükleme
  useEffect(() => {
    if (isPDF && fileUrl) {
      loadPdf();
    }
  }, [isPDF, fileUrl]);

  const loadPdf = async () => {
    try {
      setLoading(true);
      setError(null);

      let arrayBuffer;
      if (typeof window !== 'undefined' && window.electronAPI && fileUrl?.startsWith('file://')) {
        // Electron: dosyayı base64 olarak oku
        let path = fileUrl.replace(/^file:\/\/\/?/, '').replace(/^\/([A-Za-z]:)/, '$1');
        path = decodeURIComponent(path);
        const base64 = await window.electronAPI.readFileAsBase64(path);
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        arrayBuffer = bytes.buffer;
      } else {
        // Web: fetch ile al
        const response = await fetch(fileUrl);
        arrayBuffer = await response.arrayBuffer();
      }

      const loadingTask = getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      setPdfDoc(pdf);
      setTotalPages(pdf.numPages);
      await renderPageQueued(pdf, 1, scale);
      setLoading(false);
    } catch (err) {
      console.error('PDF loading error:', err);
      setError('PDF dosyası yüklenemedi: ' + err.message);
      setLoading(false);
    }
  };

  const renderPageQueued = async (pdf, pageNum, scaleValue) => {
    // Eğer şu an render varsa, iptal etmeye çalış ve sıraya al
    if (isRenderingRef.current) {
      queuedRenderRef.current = { pdf, pageNum, scaleValue };
      if (currentRenderTask) {
        try { currentRenderTask.cancel(); } catch (_) {}
      }
      return;
    }

    isRenderingRef.current = true;
    try {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: scaleValue });
      const canvas = pdfCanvasRef.current;
      if (!canvas) { isRenderingRef.current = false; return; }

      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      context.clearRect(0, 0, canvas.width, canvas.height);

      const renderTask = page.render({ canvasContext: context, viewport });
      setCurrentRenderTask(renderTask);
      await renderTask.promise.catch(() => {});
      setCurrentRenderTask(null);
    } catch (err) {
      if (err && err.name !== 'RenderingCancelledException') {
        console.error('Page render error:', err);
        setError('PDF sayfası render edilemedi');
      }
    } finally {
      isRenderingRef.current = false;
      if (queuedRenderRef.current) {
        const next = queuedRenderRef.current;
        queuedRenderRef.current = null;
        // Zincirleme şekilde bir sonraki render'ı başlat
        await renderPageQueued(next.pdf, next.pageNum, next.scaleValue);
      }
    }
  };

  const goToPage = async (pageNum) => {
    if (!pdfDoc || pageNum < 1 || pageNum > totalPages) return;
    setCurrentPage(pageNum);
    await renderPageQueued(pdfDoc, pageNum, scale);
  };

  const changeScale = async (newScale) => {
    if (!pdfDoc) return;
    setScale(newScale);
    await renderPageQueued(pdfDoc, currentPage, newScale);
  };

  // TIFF dosyası için özel işlem
  useEffect(() => {
    if (isTIFF && fileUrl) {
      loadTiffFile();
    }
  }, [isTIFF, fileUrl]);

  const loadTiffFile = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(fileUrl);
      const arrayBuffer = await response.arrayBuffer();
      
      const tiff = new Tiff({ buffer: arrayBuffer });
      const canvas = tiff.toCanvas();
      
      if (canvasRef.current && canvas) {
        const ctx = canvasRef.current.getContext('2d');
        canvasRef.current.width = canvas.width;
        canvasRef.current.height = canvas.height;
        ctx.drawImage(canvas, 0, 0);
        
        setTiffData({ width: canvas.width, height: canvas.height });
        setLoading(false);
      }
    } catch (err) {
      console.error('TIFF loading error:', err);
      setError('TIFF dosyası yüklenemedi: ' + err.message);
      setLoading(false);
    }
  };

  const handleImageLoad = () => {
    setLoading(false);
    setError(null);
  };

  const handleImageError = () => {
    setLoading(false);
    setError('Resim yüklenemedi');
  };

  // DOCX/Word dosyaları için HTML'e dönüştürme
  const [docxHtml, setDocxHtml] = useState('');
  useEffect(() => {
    const convertDocxToHtml = async () => {
      if (!isDOCX || !fileUrl) return;
      try {
        setLoading(true);
        setError(null);

        let arrayBuffer;
        if (typeof window !== 'undefined' && window.electronAPI && fileUrl.startsWith('file://')) {
          let path = fileUrl.replace(/^file:\/\/\/?/, '').replace(/^\/([A-Za-z]:)/, '$1');
          path = decodeURIComponent(path);
          const base64 = await window.electronAPI.readFileAsBase64(path);
          const binaryString = atob(base64);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          arrayBuffer = bytes.buffer;
        } else {
          const response = await fetch(fileUrl);
          arrayBuffer = await response.arrayBuffer();
        }

        const { value: html } = await mammoth.convertToHtml({ arrayBuffer });
        setDocxHtml(html);
        setLoading(false);
      } catch (err) {
        console.error('DOCX dönüştürme hatası:', err);
        setError('DOCX dosyası işlenemedi: ' + err.message);
        setLoading(false);
      }
    };

    convertDocxToHtml();
  }, [isDOCX, fileUrl]);

  const getFileTypeDisplay = () => {
    if (isPDF) return 'PDF Belgesi';
    if (isImage) return 'Resim Dosyası';
    if (isTIFF) return 'TIFF Resmi';
    return 'Dosya';
  };

  const renderViewer = () => {
    if (isPDF) {
      return (
        <div className="flex flex-col h-full">
          {/* PDF Toolbar */}
          <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {fileName || 'PDF Belgesi'}
            </div>
            <div className="flex items-center gap-2">
              <button 
                className="px-2 py-1 text-xs border rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={() => changeScale(Math.max(0.5, scale - 0.1))}
              >
                -
              </button>
              <span className="text-xs text-gray-600 dark:text-gray-300 min-w-[40px] text-center">
                {Math.round(scale * 100)}%
              </span>
              <button 
                className="px-2 py-1 text-xs border rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={() => changeScale(Math.min(3, scale + 0.1))}
              >
                +
              </button>
              <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />
              <button 
                disabled={currentPage <= 1}
                className="px-2 py-1 text-xs border rounded disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={() => goToPage(currentPage - 1)}
              >
                Önceki
              </button>
              <span className="text-xs text-gray-600 dark:text-gray-300 min-w-[50px] text-center">
                {currentPage}/{totalPages || '?'}
              </span>
              <button 
                disabled={currentPage >= totalPages}
                className="px-2 py-1 text-xs border rounded disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={() => goToPage(currentPage + 1)}
              >
                Sonraki
              </button>
              <a 
                href={fileUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="ml-2 px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Dışarıda Aç
              </a>
            </div>
          </div>
          
          {/* PDF Content - Canvas */}
          <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900 overflow-auto p-4">
            <canvas
              ref={pdfCanvasRef}
              className="max-w-full max-h-full shadow-lg bg-white"
            />
          </div>
        </div>
      );
    }

    if (isDOCX) {
      return (
        <div className="h-full overflow-auto bg-white dark:bg-gray-800 p-6 text-gray-900 dark:text-gray-100">
          <div dangerouslySetInnerHTML={{ __html: docxHtml }} />
        </div>
      );
    }

    if (isImage) {
      return (
        <div className="flex items-center justify-center h-full p-4">
          <img
            src={fileUrl}
            alt={fileName}
            className="max-w-full max-h-full object-contain shadow-lg rounded"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        </div>
      );
    }

    if (isTIFF) {
      return (
        <div className="flex items-center justify-center h-full p-4">
          <canvas
            ref={canvasRef}
            className="max-w-full max-h-full object-contain shadow-lg rounded bg-white"
          />
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-lg font-medium">Desteklenmeyen Dosya Türü</p>
          <p className="text-sm mt-2">Bu dosya türü görüntülenemez</p>
          <a 
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            İndir
          </a>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* File Toolbar - PDF ve DOCX için gizli */}
      {!isPDF && !isDOCX && (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-xs">
                {fileName || getFileTypeDisplay()}
              </h3>
              <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                {normalizedFileType.toUpperCase()}
              </span>
              {isTIFF && tiffData && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {tiffData.width} × {tiffData.height}
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <a 
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 text-xs bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                İndir
              </a>
            </div>
          </div>
        </div>
      )}

      {/* File Content */}
      <div className="flex-1 bg-gray-100 dark:bg-gray-900 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">
                {isTIFF ? 'TIFF dosyası işleniyor...' : isPDF ? 'PDF yükleniyor...' : isDOCX ? 'Word (DOCX) işleniyor...' : 'Resim yükleniyor...'}
              </p>
            </div>
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
            <div className="text-center text-red-500">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.118 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="text-lg font-medium">Dosya Yükleme Hatası</p>
              <p className="text-sm mt-2">{error}</p>
              <a 
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Tarayıcıda Aç
              </a>
            </div>
          </div>
        )}

        {renderViewer()}
      </div>
    </div>
  );
};

export default FileViewer; 