import { TelegramUser } from '../types/keno';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        isVersionAtLeast?: (version: string) => boolean;
        disableVerticalSwipes?: () => void;
        enableVerticalSwipes?: () => void;
        initData: string;
        initDataUnsafe?: {
          user?: TelegramUser;
          query_id?: string;
          auth_date?: number;
          hash?: string;
        };
        themeParams?: Record<string, string>;
        isExpanded?: boolean;
        viewportHeight?: number;
        viewportStableHeight?: number;
        headerColor?: string;
        backgroundColor?: string;
        HapticFeedback?: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
        openLink?: (url: string) => void;
        showAlert?: (message: string) => void;
        showConfirm?: (message: string, callback?: (confirmed: boolean) => void) => void;
      };
    };
  }
}

/**
 * Initialize Telegram Web App SDK
 */
export function initTelegramWebApp(): TelegramUser | null {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();
    
    // Enable vertical swipes if supported so page scrolling works naturally
    if (typeof tg.enableVerticalSwipes === 'function') {
      tg.enableVerticalSwipes();
    }

    // Set background color to match theme
    if (tg.backgroundColor) {
      tg.backgroundColor = '#070b0e';
    }
    
    return tg.initDataUnsafe?.user || null;
  }
  return null;
}

/**
 * Get initData string from Telegram Web App
 */
export function getTelegramInitData(): string {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    return window.Telegram.WebApp.initData || '';
  }
  return '';
}

/**
 * Trigger Telegram Haptic Feedback with Web Vibrations fallback
 */
export const haptic = {
  selection: () => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.selectionChanged();
    } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }
    playSynthesizedAudio('click');
  },
  impact: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'medium') => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred(style);
    } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
      const ms = style === 'light' ? 15 : style === 'medium' ? 30 : style === 'rigid' ? 40 : 50;
      navigator.vibrate(ms);
    }
    playSynthesizedAudio('bet');
  },
  notification: (type: 'success' | 'warning' | 'error') => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred(type);
    } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
      if (type === 'success') navigator.vibrate([30, 40, 60]);
      else navigator.vibrate([80, 50, 80]);
    }
    if (type === 'success') playSynthesizedAudio('win');
    else playSynthesizedAudio('lose');
  },
  ballReveal: () => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
    } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(12);
    }
    playSynthesizedAudio('ball_drop');
  },
  hitReveal: () => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('heavy');
    } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([20, 30, 40]);
    }
    playSynthesizedAudio('hit');
  }
};

/**
 * Synthesized Web Audio Sound Generator for crisp gaming SFX without external asset dependencies
 */
let audioCtx: AudioContext | null = null;
let soundMuted = false;

export function toggleAudioMute(muted?: boolean): boolean {
  if (typeof muted === 'boolean') {
    soundMuted = muted;
  } else {
    soundMuted = !soundMuted;
  }
  return soundMuted;
}

export function isAudioMuted(): boolean {
  return soundMuted;
}

function getAudioContext(): AudioContext | null {
  if (soundMuted) return null;
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playSynthesizedAudio(type: 'click' | 'bet' | 'ball' | 'ball_drop' | 'hit' | 'win' | 'lose') {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'click') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.05);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'bet') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.12);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'ball') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'ball_drop') {
      // Mechanical ball chute drop with double-bounce click
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.07);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.07);
      osc.start(now);
      osc.stop(now + 0.07);

      setTimeout(() => {
        try {
          const now2 = ctx.currentTime;
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(680, now2);
          osc2.frequency.exponentialRampToValueAtTime(320, now2 + 0.04);
          gain2.gain.setValueAtTime(0.12, now2);
          gain2.gain.exponentialRampToValueAtTime(0.01, now2 + 0.04);
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.start(now2);
          osc2.stop(now2 + 0.04);
        } catch {}
      }, 70);
    } else if (type === 'hit') {
      // High-pitched pleasant chime for player hit
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1760, now + 0.15);
      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'win') {
      // Fanfare sequence
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(freq, now + idx * 0.09);
        g.gain.setValueAtTime(0.2, now + idx * 0.09);
        g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.25);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(now + idx * 0.09);
        o.stop(now + idx * 0.09 + 0.25);
      });
    } else if (type === 'lose') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.25);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  } catch {
    // Ignore web audio autoplay restrictions
  }
}
