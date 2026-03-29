import React from 'react';
import { X, Download, Printer } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PDFPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
  title: string;
  subtitle?: string;
  onDownload: () => void;
}

const PDFPreview: React.FC<PDFPreviewProps> = ({ 
  isOpen, 
  onClose, 
  pdfUrl, 
  title,
  subtitle,
  onDownload
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
            <div>
              <h3 className="text-xl font-bold text-white">{title}</h3>
              {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={onDownload}
                className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
              >
                <Download size={18} />
                Download PDF
              </button>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* PDF View */}
          <div className="flex-1 bg-slate-800/20 p-4">
            <iframe 
              src={pdfUrl} 
              className="w-full h-full rounded-lg border border-slate-700 bg-white"
              title="PDF Preview"
            />
          </div>

          {/* Footer Info */}
          <div className="p-3 bg-slate-900/80 border-t border-slate-800 text-center">
            <p className="text-xs text-slate-500 flex items-center justify-center gap-2">
              <Printer size={12} /> Use the browser's print button inside the preview for physical printing.
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PDFPreview;
