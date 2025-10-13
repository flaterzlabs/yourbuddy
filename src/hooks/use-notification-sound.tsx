import { useCallback, useEffect, useState } from 'react';

export type SoundOption = 'off' | 'blip1' | 'blip2' | 'chime' | 'ding' | 'softbell' | 'windchime' | 'pop' | 'ping' | 'twinkle' | 'spark' | 'woodtap';

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

const STORAGE_KEY = 'caregiver-notification-sound';

export function useNotificationSound() {
  const [selectedSound, setSelectedSound] = useState<SoundOption>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored as SoundOption) || 'off';
  });

  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  // Update audio when sound selection changes
  useEffect(() => {
    if (selectedSound === 'off') {
      setAudio(null);
      return;
    }

    const newAudio = new Audio(SOUND_FILES[selectedSound]);
    newAudio.volume = 0.8; // Set volume to 80% for better audibility
    
    // Add error handling
    newAudio.addEventListener('error', (e) => {
      console.error(`Failed to load sound: ${selectedSound}`, e);
    });
    
    newAudio.addEventListener('canplaythrough', () => {
      console.log(`Sound loaded successfully: ${selectedSound}`);
    });
    
    setAudio(newAudio);

    return () => {
      newAudio.pause();
      newAudio.src = '';
    };
  }, [selectedSound]);

  const playNotificationSound = useCallback(() => {
    if (!audio || selectedSound === 'off') return;

    // Reset and play
    audio.currentTime = 0;
    audio.play()
      .then(() => {
        console.log(`Notification sound played: ${selectedSound}`);
      })
      .catch(err => {
        console.error('Failed to play notification sound:', err);
        console.error('Sound file:', SOUND_FILES[selectedSound]);
      });
  }, [audio, selectedSound]);

  const updateSound = useCallback((newSound: SoundOption) => {
    setSelectedSound(newSound);
    localStorage.setItem(STORAGE_KEY, newSound);
  }, []);

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
    selectedSound,
    updateSound,
    playNotificationSound,
    previewSound,
  };
}
