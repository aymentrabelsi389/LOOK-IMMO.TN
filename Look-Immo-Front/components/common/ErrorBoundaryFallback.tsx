import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryFallbackProps {
  error: Error;
  resetError: () => void;
}

export const ErrorBoundaryFallback: React.FC<ErrorBoundaryFallbackProps> = ({
  error,
  resetError,
}) => {
  return (
    <div className="min-h-screen bg-brand-dark flex flex-col justify-center items-center px-4 relative overflow-hidden">
      {/* Premium Background Blurs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-brand-teal/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative max-w-md w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 text-center shadow-2xl animate-zoom-in">
        {/* Warning Icon Container */}
        <div className="w-20 h-20 bg-gradient-to-r from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-500/20 transform rotate-3">
          <AlertTriangle className="text-white" size={38} />
        </div>

        <h1 className="text-2xl font-serif font-bold text-white mb-3">
          Une erreur est survenue
        </h1>
        <p className="text-gray-300 text-sm leading-relaxed mb-6 font-light">
          L'application a rencontré un problème inattendu. Nos équipes ont été alertées et travaillent à sa résolution.
        </p>

        {/* Detailed Debug Info (Only in Development) */}
        {import.meta.env.DEV && (
          <div className="mb-6 p-4 bg-black/45 border border-red-500/20 rounded-xl text-left overflow-x-auto text-[11px] font-mono text-red-300 max-h-40 custom-scrollbar select-text">
            <strong>[DEV DEBUG]:</strong> {error.message}
            <br />
            {error.stack}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              resetError();
              window.location.reload();
            }}
            className="w-full bg-gradient-to-r from-brand-teal to-blue-600 text-white py-3.5 rounded-xl font-bold hover:shadow-lg hover:shadow-brand-teal/20 transition duration-300 transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer border-none"
          >
            <RefreshCw size={18} className="animate-spin-slow" />
            Recharger la page
          </button>
          
          <button
            onClick={() => {
              resetError();
              window.location.href = '/';
            }}
            className="w-full bg-white/10 text-white hover:bg-white/15 py-3 rounded-xl font-bold transition duration-300 flex items-center justify-center gap-2 cursor-pointer border border-white/5"
          >
            <Home size={18} />
            Retourner à l'accueil
          </button>
        </div>
      </div>

      <div className="absolute bottom-6 text-[10px] text-gray-500 font-bold uppercase tracking-[0.25em]">
        Look Immo • Support Client
      </div>
    </div>
  );
};
