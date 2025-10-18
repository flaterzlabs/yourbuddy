import { useCallback, useState } from 'react';

export type SoundOption = 'off' | 'blip1' | 'blip2' | 'chime' | 'ding' | 'softbell' | 'windchime' | 'pop' | 'ping' | 'twinkle' | 'spark' | 'woodtap';
export type UrgencyLevel = 'ok' | 'attention' | 'urgent';

const SOUND_FILES: Record<Exclude<SoundOption, 'off'>, string> = {
  blip1: '/sounds/blip1.mp3',
  blip2: '/sounds/blip2.mp3',
  chime: '/sounds/chime.mp3',
  ding: '/sounds/ding.mp3',
  softbell: '/sounds/softbell.mp3',
  windchime: '/sounds/windchime.mp3',
  pop: '/sounds/pop.mp3',
  ping: '/sounds/ping.mp3',
  twinkle: '/sounds/twinkle.mp3',
  spark: '/sounds/spark.mp3',
  woodtap: '/sounds/woodtap.mp3',
};

const STORAGE_KEY = 'caregiver-notification-sounds-by-urgency';

interface SoundsByUrgency {
  ok: SoundOption;
  attention: SoundOption;
  urgent: SoundOption;
}

export function useNotificationSound() {
  const [soundsByUrgency, setSoundsByUrgency] = useState<SoundsByUrgency>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return { ok: 'blip1', attention: 'chime', urgent: 'ding' };
      }
    }
    return { ok: 'blip1', attention: 'chime', urgent: 'ding' };
  });

  const playNotificationSound = useCallback((urgency: UrgencyLevel = 'ok') => {
    const selectedSound = soundsByUrgency[urgency];
    if (selectedSound === 'off') return;

    const audio = new Audio(SOUND_FILES[selectedSound]);
    audio.volume = 0.8;
    
    audio.play()
      .then(() => {
        console.log(`Notification sound played: ${selectedSound} for urgency: ${urgency}`);
      })
      .catch(err => {
        console.error('Failed to play notification sound:', err);
        console.error('Sound file:', SOUND_FILES[selectedSound]);
      });
  }, [soundsByUrgency]);

  const updateSound = useCallback((urgency: UrgencyLevel, newSound: SoundOption) => {
    const updated = { ...soundsByUrgency, [urgency]: newSound };
    setSoundsByUrgency(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, [soundsByUrgency]);

  const previewSound = useCallback((sound: SoundOption) => {
    if (sound === 'off') return;

    const previewAudio = new Audio(SOUND_FILES[sound]);
    previewAudio.volume = 0.8;
    
    // Add error handling for preview
    previewAudio.addEventListener('error', (e) => {
      console.error(`Failed to load preview sound: ${sound}`, e);
    });
    
    previewAudio.play()
      .then(() => {
        console.log(`Preview sound played: ${sound}`);
      })
      .catch(err => {
        console.error('Failed to preview sound:', err);
        console.error('Sound file:', SOUND_FILES[sound]);
      });
  }, []);

  return {
    soundsByUrgency,
    updateSound,
    playNotificationSound,
    previewSound,
  };
}
