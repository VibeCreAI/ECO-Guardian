
import React, { useEffect, useState } from 'react';
import { Vector2 } from '../../types';

interface VirtualJoystickProps {
  onMove: (vector: Vector2) => void;
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({ onMove }) => {
  const [touchId, setTouchId] = useState<number | null>(null);
  const [origin, setOrigin] = useState({ x: 0, y: 0 }); // The center of the joystick (where touch started)
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 }); // The current touch position relative to origin
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!active) {
      onMove({ x: 0, y: 0 });
    }
  }, [active, onMove]);

  const handleStart = (e: React.TouchEvent) => {
    // Only accept one touch for the joystick
    if (touchId !== null) return;
    
    const touch = e.changedTouches[0];
    setTouchId(touch.identifier);
    
    // Set origin to the initial touch point
    setOrigin({ x: touch.clientX, y: touch.clientY });
    setCurrentPos({ x: 0, y: 0 });
    setActive(true);
  };

  const handleMove = (e: React.TouchEvent) => {
    if (touchId === null) return;
    
    // Find the active touch
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchId) {
        const touch = e.changedTouches[i];
        
        const dx = touch.clientX - origin.x;
        const dy = touch.clientY - origin.y;
        
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 40; // Joystick radius
        
        const angle = Math.atan2(dy, dx);
        const clampedDist = Math.min(distance, maxDist);
        
        const newX = Math.cos(angle) * clampedDist;
        const newY = Math.sin(angle) * clampedDist;
        
        setCurrentPos({ x: newX, y: newY });
        
        // Normalized output (-1 to 1)
        onMove({
          x: newX / maxDist,
          y: newY / maxDist
        });
        break;
      }
    }
  };

  const handleEnd = (e: React.TouchEvent) => {
     for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchId) {
        setTouchId(null);
        setActive(false);
        setCurrentPos({ x: 0, y: 0 });
        break;
      }
    }
  };

  return (
    <div 
      className="absolute inset-0 touch-none pointer-events-auto"
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
      onTouchCancel={handleEnd}
    >
      {active && (
        <>
            {/* Joystick Base */}
            <div 
                className="absolute w-32 h-32 bg-gray-900/50 rounded-full border-2 border-white/30 backdrop-blur-sm"
                style={{
                    left: origin.x,
                    top: origin.y,
                    transform: 'translate(-50%, -50%)',
                }}
            />
            {/* Joystick Knob */}
            <div 
                className="absolute w-12 h-12 bg-white rounded-full shadow-lg"
                style={{
                    left: origin.x,
                    top: origin.y,
                    transform: `translate(calc(-50% + ${currentPos.x}px), calc(-50% + ${currentPos.y}px))`,
                }}
            />
        </>
      )}
    </div>
  );
};
