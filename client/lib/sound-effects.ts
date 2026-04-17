export type SoundEffectId = 'gameStart' | 'capture' | 'defeat' | 'victory';

type SoundEffectConfig = {
  src: string;
  volume: number;
};

const SOUND_EFFECTS: Record<SoundEffectId, SoundEffectConfig> = {
  gameStart: {
    src: '/audio/game-start.mp3',
    volume: 0.5,
  },
  capture: {
    src: '/audio/player-captured.mp3',
    volume: 0.45,
  },
  defeat: {
    src: '/audio/player-defeated.mp3',
    volume: 0.55,
  },
  victory: {
    src: '/audio/victory.mp3',
    volume: 0.55,
  },
};

class SoundEffectsManager {
  private initialized = false;
  private unlocked = false;
  private audioElements = new Map<SoundEffectId, HTMLAudioElement>();

  init() {
    if (typeof window === 'undefined' || this.initialized) {
      return;
    }

    this.initialized = true;

    (Object.entries(SOUND_EFFECTS) as [SoundEffectId, SoundEffectConfig][]).forEach(
      ([id, config]) => {
        const audio = new Audio(config.src);
        audio.preload = 'auto';
        audio.volume = config.volume;
        this.audioElements.set(id, audio);
      }
    );

    const unlock = () => {
      this.unlocked = true;

      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };

    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });
  }

  play(id: SoundEffectId) {
    if (typeof window === 'undefined') {
      return;
    }

    this.init();

    if (!this.unlocked) {
      return;
    }

    const baseAudio = this.audioElements.get(id);
    if (!baseAudio) {
      return;
    }

    const audio = baseAudio.cloneNode() as HTMLAudioElement;
    audio.volume = baseAudio.volume;
    void audio.play().catch(() => undefined);
  }
}

export const soundEffects = new SoundEffectsManager();
