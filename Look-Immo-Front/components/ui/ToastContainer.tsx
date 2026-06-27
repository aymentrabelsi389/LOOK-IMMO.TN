import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  Loader2,
  Volume2,
  VolumeX
} from 'lucide-react';
import { notificationStore, Toast } from '../../services/notificationStore';

const ToastContainer = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [queueCount, setQueueCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Sync state with global notificationStore
  useEffect(() => {
    setToasts(notificationStore.getToasts());
    setQueueCount(notificationStore.getQueueCount());
    setSoundEnabled(notificationStore.isSoundEnabled());

    const unsubscribe = notificationStore.subscribe(() => {
      setToasts(notificationStore.getToasts());
      setQueueCount(notificationStore.getQueueCount());
      setSoundEnabled(notificationStore.isSoundEnabled());
    });

    return unsubscribe;
  }, []);

  // Keyboard accessibility: dismiss topmost toast on Escape press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && toasts.length > 0) {
        // Dismiss the most recently added active toast
        const target = toasts[toasts.length - 1];
        notificationStore.dismiss(target.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toasts]);

  const getAccentColor = (type: Toast['type']) => {
    switch (type) {
      case 'success': return 'bg-emerald-500';
      case 'error': return 'bg-red-500';
      case 'warning': return 'bg-amber-500';
      case 'info': return 'bg-brand-teal';
      case 'loading': return 'bg-brand-teal';
      default: return 'bg-gray-500';
    }
  };

  const getIcon = (type: Toast['type']) => {
    const size = 18;
    switch (type) {
      case 'success':
        return <CheckCircle2 size={size} className="text-emerald-500 dark:text-emerald-400" />;
      case 'error':
        return <AlertCircle size={size} className="text-red-500 dark:text-red-400" />;
      case 'warning':
        return <AlertTriangle size={size} className="text-amber-500 dark:text-amber-400" />;
      case 'info':
        return <Info size={size} className="text-brand-teal" />;
      case 'loading':
        return <Loader2 size={size} className="text-brand-teal animate-spin" />;
      default:
        return <Info size={size} className="text-gray-500" />;
    }
  };

  const getBgStyle = (type: Toast['type']) => {
    switch (type) {
      case 'success': return 'from-emerald-50/40 to-emerald-100/10 dark:from-emerald-950/20 dark:to-transparent';
      case 'error': return 'from-red-50/40 to-red-100/10 dark:from-red-950/20 dark:to-transparent';
      case 'warning': return 'from-amber-50/40 to-amber-100/10 dark:from-amber-950/20 dark:to-transparent';
      default: return 'from-brand-teal/5 to-transparent';
    }
  };

  return (
    <div
      className="fixed top-4 left-4 right-4 md:top-6 md:left-1/2 md:-translate-x-1/2 md:w-96 z-[999999] flex flex-col gap-3 pointer-events-none"
      role="status"
      aria-live="polite"
    >
      {/* Control Banner for managing sounds and clears */}
      {toasts.length > 0 && (
        <div className="flex items-center justify-between px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-white/20 dark:border-white/5 backdrop-blur-md shadow-sm pointer-events-auto transition-all animate-toast-in-desktop md:animate-toast-in-desktop max-sm:animate-toast-in-mobile">
          <span className="flex items-center gap-1.5 font-bold tracking-tight">
            <span>Notifications</span>
            {queueCount > 0 && (
              <span className="bg-brand-teal/20 text-brand-teal px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
                +{queueCount} en file
              </span>
            )}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => notificationStore.toggleSound()}
              className="p-1 hover:bg-gray-100/80 dark:hover:bg-slate-800/80 rounded-lg transition-colors flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider"
              title={soundEnabled ? "Muter le son" : "Activer le son"}
            >
              {soundEnabled ? <Volume2 size={12} className="text-brand-teal" /> : <VolumeX size={12} className="text-gray-400" />}
              <span>{soundEnabled ? "Sonore" : "Muet"}</span>
            </button>
            <button
              onClick={() => notificationStore.clear()}
              className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 text-[10px] uppercase font-black tracking-wider transition-colors"
            >
              Tout effacer
            </button>
          </div>
        </div>
      )}

      {/* Render Active Toasts */}
      {toasts.map((toast, index) => {
        const isHovered = hoveredId === toast.id;
        const hasProgress = toast.progress !== undefined;

        return (
          <div
            key={toast.id}
            onMouseEnter={() => setHoveredId(toast.id)}
            onMouseLeave={() => setHoveredId(null)}
            className={`
            toast-focusable relative flex flex-col rounded-2xl overflow-hidden
            toast-glass pointer-events-auto
            transition-all duration-300 transform text-gray-900 dark:text-white
            hover:-translate-y-0.5 hover:scale-[1.015] hover:shadow-glow
            max-sm:animate-toast-in-mobile md:animate-toast-in-desktop
            `}
            style={{
              zIndex: 1000 - index,
            }}
          >
            {/* Visual background hue accent */}
            <div className={`absolute inset-0 bg-gradient-to-r -z-10 opacity-70 ${getBgStyle(toast.type)}`} />

            {/* Main content body */}
            <div className="flex items-start gap-3.5 p-4">
              {/* Type Indicator Icon */}
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white dark:bg-slate-800/80 shadow-sm border border-gray-100/50 dark:border-white/5">
                  {getIcon(toast.type)}
                </div>
              </div>

              {/* Message Details */}
              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug break-words">
                    {toast.message}
                  </p>

                  {/* Repeated visual badge counter */}
                  {toast.count > 1 && (
                    <span className="bg-brand-teal text-white text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase shadow-sm">
                      {toast.count}x
                    </span>
                  )}
                </div>

                {/* Aggregate dynamic upload details */}
                {toast.totalFiles !== undefined && (
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 font-bold">
                    Fichier(s) traité(s): {toast.filesCount || 0} sur {toast.totalFiles}
                  </p>
                )}

                {/* Progress bar container */}
                {hasProgress && (
                  <div className="w-full bg-gray-100 dark:bg-slate-800/60 rounded-full h-1.5 mt-2.5 overflow-hidden border border-gray-200/20">
                    <div
                      className={`h-full ${getAccentColor(toast.type)} rounded-full transition-all duration-300 ease-out`}
                      style={{ width: `${Math.min(100, Math.max(0, toast.progress!))}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Close Button */}
              <button
                onClick={() => notificationStore.dismiss(toast.id)}
                className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100/80 dark:hover:bg-slate-800/80 transition-all pointer-events-auto"
                aria-label="Fermer la notification"
              >
                <X size={14} />
              </button>
            </div>

            {/* Bottom time-limit shrink progress bar */}
            {!isHovered && toast.duration && toast.duration > 0 && (
              <div
                className={`absolute bottom-0 left-0 h-[3px] toast-progress-bar ${getAccentColor(toast.type)} opacity-60`}
                style={{
                  animationDuration: `${toast.duration}ms`
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ToastContainer;
