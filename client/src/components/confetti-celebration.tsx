import React, { useCallback, useEffect, useState } from 'react';
import confetti from 'canvas-confetti';

type ConfettiOptions = {
  spread?: number;
  startVelocity?: number;
  decay?: number;
  scalar?: number;
  particleCount?: number;
  colors?: string[];
  origin?: {
    x?: number;
    y?: number;
  };
  angle?: number;
  ticks?: number;
  shapes?: ('square' | 'circle')[];
  drift?: number;
  gravity?: number;
};

interface ConfettiCelebrationProps {
  active: boolean;
  message?: string;
  options?: ConfettiOptions;
  duration?: number;
  onComplete?: () => void;
}

const defaultOptions: ConfettiOptions = {
  particleCount: 100,
  spread: 70,
  origin: { y: 0.6 },
  colors: ['#26ccff', '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42', '#ffa62d', '#ff36ff']
};

// Animações predefinidas
export const confettiAnimations = {
  basic: {
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 }
  },
  milestone: {
    particleCount: 200,
    spread: 160,
    origin: { y: 0.6 },
    startVelocity: 30,
    decay: 0.94,
    gravity: 1
  },
  achievement: {
    particleCount: 300,
    angle: 120,
    spread: 70,
    origin: { x: 0, y: 0.6 },
    colors: ['#FFD700', '#FFA500', '#FF4500', '#FF0000', '#800080', '#4B0082', '#0000FF']
  },
  fireWorks: {
    particleCount: 150,
    spread: 360,
    startVelocity: 45,
    decay: 0.9,
    gravity: 1,
    drift: 0
  }
};

export const ConfettiCelebration: React.FC<ConfettiCelebrationProps> = ({
  active,
  message,
  options = defaultOptions,
  duration = 3000,
  onComplete
}) => {
  const [visible, setVisible] = useState(false);

  // Função que dispara o confete
  const fireConfetti = useCallback(() => {
    const mergedOptions = { ...defaultOptions, ...options };
    
    // Executa a animação de confete
    confetti({
      ...mergedOptions
    });
    
    // Para animações mais elaboradas, podemos disparar múltiplos confetes
    if (options === confettiAnimations.fireWorks || options === confettiAnimations.milestone) {
      setTimeout(() => {
        confetti({
          ...mergedOptions,
          origin: { x: 0.2, y: 0.5 }
        });
      }, 300);
      
      setTimeout(() => {
        confetti({
          ...mergedOptions,
          origin: { x: 0.8, y: 0.5 }
        });
      }, 600);
    }
  }, [options]);

  useEffect(() => {
    if (active) {
      setVisible(true);
      fireConfetti();
      
      // Esconde o componente após a duração especificada
      const timer = setTimeout(() => {
        setVisible(false);
        if (onComplete) onComplete();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [active, duration, fireConfetti, onComplete]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 transition-opacity">
      <div className="relative rounded-lg bg-white p-8 shadow-xl animate-fade-in">
        {message && (
          <h2 className="mb-4 text-center text-2xl font-bold text-green-600">{message}</h2>
        )}
      </div>
    </div>
  );
};

export default ConfettiCelebration;