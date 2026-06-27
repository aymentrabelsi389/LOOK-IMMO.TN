export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'loading' | 'info';
  message: string;
  progress?: number;     // upload or loading progress percentage (0 - 100)
  filesCount?: number;   // current count for uploaded files
  totalFiles?: number;   // total files count
  count: number;         // visual grouping counter for repeat instances
  duration?: number;     // custom override for duration
  createdAt: number;
}

export interface NotifyOptions {
  duration?: number;
  progress?: number;
  filesCount?: number;
  totalFiles?: number;
}

type Listener = () => void;

let listeners: Listener[] = [];
let toasts: Toast[] = [];
let queue: Toast[] = [];
let soundEnabled = localStorage.getItem('lookimmo_sound_enabled') !== 'false';
const recentMessages = new Map<string, number>();
const activeTimers = new Map<string, number>();

// Helper to determine dismiss duration
const getDuration = (type: Toast['type'], customDuration?: number): number => {
  if (customDuration !== undefined) return customDuration;
  switch (type) {
    case 'success': return 3000;
    case 'info': return 4000;
    case 'warning': return 5000;
    case 'error': return 6000;
    case 'loading': return 0; // Persistent until programmatically closed or updated
    default: return 4000;
  }
};

// Programmatic Web Audio Synthesizer for notifications
const playAudio = (type: Toast['type']) => {
  if (!soundEnabled || type === 'loading') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    const now = ctx.currentTime;
    
    if (type === 'success') {
      // Rising arpeggio (C5 -> E5)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc1.type = 'sine';
      osc2.type = 'sine';
      
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc2.frequency.setValueAtTime(659.25, now + 0.08); // E5
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.04, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      
      osc1.start(now);
      osc1.stop(now + 0.12);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.3);
    } else if (type === 'error') {
      // Warm low alert (D3 -> C3)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(146.83, now); // D3
      osc.frequency.setValueAtTime(130.81, now + 0.1); // C3
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'warning') {
      // Gentle warning chime (A4)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440.00, now); // A4
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.05, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'info') {
      // Modern subtle ping (F5)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(698.46, now); // F5
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.04, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.2);
    }
  } catch (e) {
    // Silent fail if browser restricts audio context before user gesture
  }
};

const notifyListeners = () => {
  listeners.forEach(l => l());
};

const scheduleDismiss = (toast: Toast) => {
  // Clear existing timer if any
  if (activeTimers.has(toast.id)) {
    clearTimeout(activeTimers.get(toast.id));
    activeTimers.delete(toast.id);
  }
  
  const duration = getDuration(toast.type, toast.duration);
  if (duration > 0) {
    const timer = setTimeout(() => {
      dismiss(toast.id);
    }, duration) as any;
    activeTimers.set(toast.id, timer);
  }
};

const dismiss = (id: string) => {
  if (activeTimers.has(id)) {
    clearTimeout(activeTimers.get(id));
    activeTimers.delete(id);
  }
  
  const prevVisibleLength = toasts.length;
  toasts = toasts.filter(t => t.id !== id);
  queue = queue.filter(t => t.id !== id);
  
  if (toasts.length !== prevVisibleLength) {
    balanceToasts();
  } else {
    notifyListeners();
  }
};

const balanceToasts = () => {
  while (toasts.length < 3 && queue.length > 0) {
    const next = queue.shift();
    if (next) {
      toasts.push(next);
      scheduleDismiss(next);
    }
  }
  notifyListeners();
};

const createToast = (type: Toast['type'], message: string, options: NotifyOptions = {}): string => {
  const msg = message.trim();
  const now = Date.now();
  
  // 1. Duplicate & Spam Check (within 5 seconds)
  const lastSeen = recentMessages.get(msg);
  if (lastSeen && now - lastSeen < 5000) {
    const existing = toasts.find(t => t.message === msg) || queue.find(t => t.message === msg);
    if (existing) {
      existing.count += 1;
      existing.createdAt = now;
      if (options.progress !== undefined) existing.progress = options.progress;
      if (options.filesCount !== undefined) existing.filesCount = options.filesCount;
      if (options.totalFiles !== undefined) existing.totalFiles = options.totalFiles;
      
      // Reset lifespan timer
      scheduleDismiss(existing);
      notifyListeners();
      return existing.id;
    }
    // Message recently dismissed, don't double show
    return '';
  }
  
  recentMessages.set(msg, now);
  
  // Clean duplicate history map if it grows too large
  if (recentMessages.size > 50) {
    for (const [k, v] of recentMessages.entries()) {
      if (now - v > 10000) recentMessages.delete(k);
    }
  }
  
  const id = `notif_${now}_${Math.random().toString(36).substring(2, 9)}`;
  const toast: Toast = {
    id,
    type,
    message: msg,
    progress: options.progress,
    filesCount: options.filesCount,
    totalFiles: options.totalFiles,
    count: 1,
    duration: options.duration,
    createdAt: now
  };
  
  playAudio(type);
  
  queue.push(toast);
  balanceToasts();
  return id;
};

export const notificationStore = {
  // Subscriptions
  subscribe(listener: Listener) {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  },
  
  // Getters
  getToasts(): Toast[] {
    return [...toasts];
  },
  
  getQueueCount(): number {
    return queue.length;
  },
  
  isSoundEnabled(): boolean {
    return soundEnabled;
  },
  
  // Actions
  toggleSound() {
    soundEnabled = !soundEnabled;
    localStorage.setItem('lookimmo_sound_enabled', String(soundEnabled));
    notifyListeners();
  },
  
  dismiss(id: string) {
    dismiss(id);
  },
  
  clear() {
    activeTimers.forEach(timer => clearTimeout(timer));
    activeTimers.clear();
    toasts = [];
    queue = [];
    notifyListeners();
  },
  
  update(id: string, updates: Partial<Omit<Toast, 'id'>>) {
    let found = false;
    
    toasts = toasts.map(t => {
      if (t.id === id) {
        found = true;
        const updated = { ...t, ...updates };
        
        // Reset timers if status/duration changed
        if (updates.type !== undefined || updates.duration !== undefined) {
          scheduleDismiss(updated);
        }
        return updated;
      }
      return t;
    });
    
    if (!found) {
      queue = queue.map(t => {
        if (t.id === id) {
          return { ...t, ...updates };
        }
        return t;
      });
    }
    
    notifyListeners();
  }
};

// Main global notify object
export const notify = {
  success(message: string, options?: NotifyOptions) {
    return createToast('success', message, options);
  },
  error(message: string, options?: NotifyOptions) {
    return createToast('error', message, options);
  },
  warning(message: string, options?: NotifyOptions) {
    return createToast('warning', message, options);
  },
  info(message: string, options?: NotifyOptions) {
    return createToast('info', message, options);
  },
  loading(message: string, options?: NotifyOptions) {
    return createToast('loading', message, options);
  },
  // Convenience shortcuts so callers don't need to import notificationStore separately
  update(id: string, updates: Partial<Omit<Toast, 'id'>>) {
    notificationStore.update(id, updates);
  },
  dismiss(id: string) {
    notificationStore.dismiss(id);
  }
};
