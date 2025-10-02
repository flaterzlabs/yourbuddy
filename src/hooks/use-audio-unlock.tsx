import { useEffect, useCallback, useState } from 'react';

/**
 * Hook para desbloquear áudio em dispositivos móveis
 * Navegadores móveis bloqueiam reprodução automática de áudio sem interação do usuário
 * Este hook cria um AudioContext e o desbloqueia no primeiro toque/clique
 */
export function useAudioUnlock() {
  const [isUnlocked, setIsUnlocked] = useState(false);

  const unlockAudio = useCallback(() => {
    if (isUnlocked) return;

    // Cria um AudioContext silencioso para desbloquear o áudio
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Cria um buffer vazio e toca (silenciosamente)
    const buffer = audioContext.createBuffer(1, 1, 22050);
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start(0);

    // Resume o contexto (necessário em alguns navegadores)
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    setIsUnlocked(true);
    console.log('🔊 Audio unlocked for notifications');

    // Limpa os event listeners após o desbloqueio
    document.removeEventListener('touchstart', unlockAudio);
    document.removeEventListener('touchend', unlockAudio);
    document.removeEventListener('click', unlockAudio);
  }, [isUnlocked]);

  useEffect(() => {
    // Adiciona listeners para o primeiro toque/clique
    document.addEventListener('touchstart', unlockAudio, { once: true });
    document.addEventListener('touchend', unlockAudio, { once: true });
    document.addEventListener('click', unlockAudio, { once: true });

    return () => {
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('touchend', unlockAudio);
      document.removeEventListener('click', unlockAudio);
    };
  }, [unlockAudio]);

  return { isUnlocked, unlockAudio };
}
