import React, { createContext, useContext, useState, useRef } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error('useConfirm must be used within a ConfirmProvider');
  return context;
};

export const ConfirmProvider = ({ children }: { children: React.ReactNode }) => {
  const [show, setShow] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({ title: '', message: '' });
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = (opts: ConfirmOptions | string): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      if (typeof opts === 'string') {
        setOptions({
          title: 'Confirmation',
          message: opts,
          confirmText: 'Confirmer',
          cancelText: 'Annuler',
          variant: 'danger'
        });
      } else {
        setOptions({
          title: opts.title || 'Confirmation',
          message: opts.message,
          confirmText: opts.confirmText || 'Confirmer',
          cancelText: opts.cancelText || 'Annuler',
          variant: opts.variant || 'danger'
        });
      }
      setShow(true);
    });
  };

  const handleConfirm = () => {
    resolverRef.current?.(true);
    setShow(false);
  };

  const handleCancel = () => {
    resolverRef.current?.(false);
    setShow(false);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {show && (
        <div 
          className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"
          onClick={handleCancel}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
              options.variant === 'warning' 
                ? 'bg-amber-50 text-amber-500' 
                : options.variant === 'info' 
                  ? 'bg-blue-50 text-blue-500' 
                  : 'bg-red-50 text-red-500'
            }`}>
              {options.variant === 'warning' ? (
                <AlertTriangle size={40} />
              ) : (
                <Trash2 size={40} />
              )}
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2 font-serif">{options.title}</h3>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed">
              {options.message}
            </p>
            <div className="flex gap-3">
              <button 
                onClick={handleCancel} 
                className="flex-1 py-4 border border-gray-200 text-gray-700 font-bold rounded-2xl hover:bg-gray-50 transition-all text-sm uppercase tracking-wider"
              >
                {options.cancelText}
              </button>
              <button 
                onClick={handleConfirm} 
                className={`flex-1 py-4 text-white font-bold rounded-2xl transition-all text-sm uppercase tracking-wider active:scale-95 shadow-lg ${
                  options.variant === 'warning'
                    ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
                    : options.variant === 'info'
                      ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                      : 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
                }`}
              >
                {options.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};
