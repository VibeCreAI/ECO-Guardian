
import React, { Suspense, useRef, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Preload } from '@react-three/drei';
import { UIOverlay } from './components/ui/UIOverlay';
import { Scene } from './components/game/Scene';
import { AudioManager } from './components/game/AudioManager';
import { Vector2 } from './types';
import { useGameStore } from './store/gameStore';

const App: React.FC = () => {
  // Input References (mutable ref to avoid re-renders on every frame input)
  const inputVector = useRef<Vector2>({ x: 0, y: 0 });
  const dashTrigger = useRef<boolean>(false);
  
  const [isMobile, setIsMobile] = useState(false);

  // Platform detection
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      // Robust mobile detection
      return /android|ipad|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 1 && /Macintosh/i.test(userAgent) === false); 
    };
    
    setIsMobile(checkMobile());
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      switch (key) {
        case 'w':
        case 'arrowup': 
          inputVector.current.y = -1; break;
        case 's':
        case 'arrowdown': 
          inputVector.current.y = 1; break;
        case 'a':
        case 'arrowleft': 
          inputVector.current.x = -1; break;
        case 'd':
        case 'arrowright': 
          inputVector.current.x = 1; break;
        case ' ': dashTrigger.current = true; break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      switch (key) {
        case 'w':
        case 'arrowup': 
          if (inputVector.current.y < 0) inputVector.current.y = 0; break;
        case 's':
        case 'arrowdown': 
          if (inputVector.current.y > 0) inputVector.current.y = 0; break;
        case 'a':
        case 'arrowleft': 
          if (inputVector.current.x < 0) inputVector.current.x = 0; break;
        case 'd':
        case 'arrowright': 
          if (inputVector.current.x > 0) inputVector.current.x = 0; break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleDash = () => {
    dashTrigger.current = true;
  };

  return (
    <div
      className="relative bg-neutral-900 overflow-hidden pixel-art"
      style={{ width: '100vw', height: '100dvh', minHeight: '100dvh' }}
    >
      <AudioManager />
      {/* Performance Optimization: Removed shadows={true} */}
      <Canvas camera={{ position: [0, 10, 10], fov: 45 }}>
        <Suspense fallback={null}>
          <Scene inputVector={inputVector} dashTrigger={dashTrigger} />
          <Preload all />
        </Suspense>
      </Canvas>
      
      <UIOverlay
        inputVector={inputVector}
        onDash={handleDash}
        isMobile={isMobile}
      />
    </div>
  );
};

export default App;
