'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, Star, Sparkles, Zap, Heart, Trophy } from 'lucide-react';

interface CelebrationAnimationProps {
  isVisible: boolean;
  onComplete?: () => void;
  type?: 'confetti' | 'success' | 'stars' | 'duolingo' | 'wrong';
  message?: string;
}

export default function CelebrationAnimation({ 
  isVisible, 
  onComplete, 
  type = 'duolingo',
  message
}: CelebrationAnimationProps) {
  const [showAnimation, setShowAnimation] = useState(false);
  const [animationPhase, setAnimationPhase] = useState(0);

  useEffect(() => {
    if (isVisible) {
      console.log(`=== CELEBRATION ANIMATION DEBUG ===`);
      console.log(`CelebrationAnimation triggered with type: "${type}"`);
      console.log(`Message: "${message}"`);
      console.log(`isVisible: ${isVisible}`);
      setShowAnimation(true);
      setAnimationPhase(0);
      
      // Phase 1: Initial burst (100ms)
      const phase1Timer = setTimeout(() => {
        setAnimationPhase(1);
      }, 100);
      
      // Phase 2: Celebration message (200ms)
      const phase2Timer = setTimeout(() => {
        setAnimationPhase(2);
      }, 200);
      
      // Phase 3: Complete animation (1000ms total)
      const completeTimer = setTimeout(() => {
        setShowAnimation(false);
        onComplete?.();
      }, 1000);

      return () => {
        clearTimeout(phase1Timer);
        clearTimeout(phase2Timer);
        clearTimeout(completeTimer);
      };
    }
  }, [isVisible, onComplete]);

  if (!showAnimation) return null;

  console.log(`Rendering celebration animation - type: ${type}, phase: ${animationPhase}, message: "${message}"`);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
      {/* Duolingo-style Animation */}
      {type === 'duolingo' && (
        <div className="relative w-full h-full">
          {/* Background pulse effect */}
          <div className="absolute inset-0 bg-green-400 opacity-20 animate-pulse-scale" />
          
          {/* Main celebration icon with bounce */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="relative">
              {/* Main check circle with scale animation */}
              <div className={`transform transition-all duration-300 ${animationPhase >= 0 ? 'scale-100' : 'scale-0'}`}>
                <CheckCircle className="h-32 w-32 text-green-500 drop-shadow-lg animate-bounce-check" />
              </div>
              
              {/* Sparkle effects around the main icon */}
              {animationPhase >= 1 && (
                <>
                  {/* Top sparkles */}
                  <div className="absolute -top-4 -right-4 animate-sparkle-1">
                    <Sparkles className="h-8 w-8 text-yellow-400" />
                  </div>
                  <div className="absolute -top-2 -left-6 animate-sparkle-2">
                    <Star className="h-6 w-6 text-yellow-400" />
                  </div>
                  
                  {/* Bottom sparkles */}
                  <div className="absolute -bottom-4 -left-4 animate-sparkle-3">
                    <Zap className="h-7 w-7 text-blue-400" />
                  </div>
                  <div className="absolute -bottom-2 -right-6 animate-sparkle-4">
                    <Heart className="h-5 w-5 text-pink-400" />
                  </div>
                  
                  {/* Side sparkles */}
                  <div className="absolute top-1/2 -left-8 transform -translate-y-1/2 animate-sparkle-5">
                    <Trophy className="h-6 w-6 text-purple-400" />
                  </div>
                  <div className="absolute top-1/2 -right-8 transform -translate-y-1/2 animate-sparkle-6">
                    <Star className="h-5 w-5 text-orange-400" />
                  </div>
                </>
              )}
            </div>
            
            {/* Celebration message with slide-in effect */}
            {animationPhase >= 2 && message && (
              <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 animate-slide-up">
                <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-full px-6 py-3 shadow-xl">
                  <span className="text-xl font-bold tracking-wide">{message}</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Floating particles */}
          {animationPhase >= 1 && (
            <>
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute animate-float-particle"
                  style={{
                    left: `${20 + Math.random() * 60}%`,
                    top: `${20 + Math.random() * 60}%`,
                    animationDelay: `${Math.random() * 0.5}s`,
                    animationDuration: `${1 + Math.random() * 0.5}s`,
                  }}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      ['bg-green-400', 'bg-blue-400', 'bg-yellow-400', 'bg-purple-400', 'bg-pink-400'][
                        Math.floor(Math.random() * 5)
                      ]
                    } opacity-80`}
                  />
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Enhanced Confetti Animation */}
      {type === 'confetti' && (
        <div className="relative w-full h-full">
          {/* Confetti pieces with more variety */}
          {[...Array(80)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti-enhanced"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            >
              <div
                className={`w-3 h-3 rounded-full ${
                  ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500'][
                    Math.floor(Math.random() * 6)
                  ]
                }`}
                style={{
                  transform: `rotate(${Math.random() * 360}deg)`,
                }}
              />
            </div>
          ))}
          
          {/* Success message with enhanced styling */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-full p-6 shadow-2xl">
              <CheckCircle className="h-20 w-20 text-white animate-pulse" />
              {message && (
                <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2">
                  <div className="bg-white rounded-full px-6 py-3 shadow-lg">
                    <span className="text-xl font-bold text-gray-800">{message}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Success Animation */}
      {type === 'success' && (
        <div className="animate-bounce">
          <div className="relative">
            <CheckCircle className="h-24 w-24 text-green-500 animate-pulse" />
            <div className="absolute -top-2 -right-2">
              <Sparkles className="h-8 w-8 text-yellow-400 animate-spin" />
            </div>
            <div className="absolute -bottom-2 -left-2">
              <Star className="h-6 w-6 text-yellow-400 animate-ping" />
            </div>
          </div>
        </div>
      )}

      {/* Stars Animation */}
      {type === 'stars' && (
        <div className="relative">
          <div className="animate-bounce">
            <Star className="h-20 w-20 text-yellow-400 animate-spin" />
          </div>
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-ping"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 1}s`,
              }}
            >
              <Star className="h-4 w-4 text-yellow-400" />
            </div>
          ))}
        </div>
      )}

      {/* Wrong Answer Animation - Just the X image, no message */}
      {type === 'wrong' && (
        <div className="relative w-full h-full">
          {/* Background pulse effect - soft orange */}
          <div className="absolute inset-0 bg-orange-300 opacity-15 animate-pulse-scale" />
          
          {/* Main X icon with bounce */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="relative">
              {/* Main X circle with scale animation */}
              <div className={`transform transition-all duration-300 ${animationPhase >= 0 ? 'scale-100' : 'scale-0'}`}>
                <div className="h-32 w-32 text-red-500 drop-shadow-lg animate-bounce-check flex items-center justify-center">
                  <div className="text-6xl font-bold">✗</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subtle overlay for better visibility */}
      <div className="absolute inset-0 bg-black bg-opacity-5" />
    </div>
  );
}

// Add custom CSS animations
const styles = `
@keyframes confetti {
  0% {
    transform: translateY(-100vh) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(100vh) rotate(720deg);
    opacity: 0;
  }
}

@keyframes confetti-enhanced {
  0% {
    transform: translateY(-100vh) rotate(0deg) scale(1);
    opacity: 1;
  }
  50% {
    transform: translateY(50vh) rotate(180deg) scale(1.2);
    opacity: 0.8;
  }
  100% {
    transform: translateY(100vh) rotate(360deg) scale(0.8);
    opacity: 0;
  }
}

@keyframes bounce-check {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0) scale(1);
  }
  40% {
    transform: translateY(-20px) scale(1.1);
  }
  60% {
    transform: translateY(-10px) scale(1.05);
  }
}

@keyframes sparkle-1 {
  0% { transform: scale(0) rotate(0deg); opacity: 0; }
  50% { transform: scale(1.2) rotate(180deg); opacity: 1; }
  100% { transform: scale(1) rotate(360deg); opacity: 0.8; }
}

@keyframes sparkle-2 {
  0% { transform: scale(0) rotate(0deg); opacity: 0; }
  30% { transform: scale(1.1) rotate(120deg); opacity: 1; }
  70% { transform: scale(0.9) rotate(240deg); opacity: 0.9; }
  100% { transform: scale(1) rotate(360deg); opacity: 0.7; }
}

@keyframes sparkle-3 {
  0% { transform: scale(0) rotate(0deg); opacity: 0; }
  40% { transform: scale(1.3) rotate(150deg); opacity: 1; }
  80% { transform: scale(0.8) rotate(300deg); opacity: 0.8; }
  100% { transform: scale(1) rotate(360deg); opacity: 0.6; }
}

@keyframes sparkle-4 {
  0% { transform: scale(0) rotate(0deg); opacity: 0; }
  25% { transform: scale(1.1) rotate(90deg); opacity: 1; }
  75% { transform: scale(0.9) rotate(270deg); opacity: 0.9; }
  100% { transform: scale(1) rotate(360deg); opacity: 0.7; }
}

@keyframes sparkle-5 {
  0% { transform: scale(0) rotate(0deg); opacity: 0; }
  35% { transform: scale(1.2) rotate(125deg); opacity: 1; }
  70% { transform: scale(0.8) rotate(250deg); opacity: 0.8; }
  100% { transform: scale(1) rotate(360deg); opacity: 0.6; }
}

@keyframes sparkle-6 {
  0% { transform: scale(0) rotate(0deg); opacity: 0; }
  45% { transform: scale(1.1) rotate(160deg); opacity: 1; }
  85% { transform: scale(0.9) rotate(320deg); opacity: 0.9; }
  100% { transform: scale(1) rotate(360deg); opacity: 0.7; }
}

@keyframes slide-up {
  0% { transform: translateY(20px) translateX(-50%); opacity: 0; }
  100% { transform: translateY(0) translateX(-50%); opacity: 1; }
}

@keyframes float-particle {
  0% { transform: translateY(0px) scale(0); opacity: 0; }
  20% { transform: translateY(-10px) scale(1); opacity: 1; }
  80% { transform: translateY(-30px) scale(0.8); opacity: 0.8; }
  100% { transform: translateY(-50px) scale(0); opacity: 0; }
}

@keyframes shake-1 {
  0%, 100% { transform: translateX(0) rotate(0deg); }
  25% { transform: translateX(-2px) rotate(-5deg); }
  75% { transform: translateX(2px) rotate(5deg); }
}

@keyframes shake-2 {
  0%, 100% { transform: translateX(0) rotate(0deg); }
  25% { transform: translateX(2px) rotate(5deg); }
  75% { transform: translateX(-2px) rotate(-5deg); }
}

@keyframes shake-3 {
  0%, 100% { transform: translateX(0) rotate(0deg); }
  25% { transform: translateX(-3px) rotate(-3deg); }
  75% { transform: translateX(3px) rotate(3deg); }
}

@keyframes shake-4 {
  0%, 100% { transform: translateX(0) rotate(0deg); }
  25% { transform: translateX(3px) rotate(3deg); }
  75% { transform: translateX(-3px) rotate(-3deg); }
}

@keyframes pulse-scale {
  0%, 100% { transform: scale(1); opacity: 0.2; }
  50% { transform: scale(1.05); opacity: 0.3; }
}

.animate-confetti {
  animation: confetti linear forwards;
}

.animate-confetti-enhanced {
  animation: confetti-enhanced linear forwards;
}

.animate-bounce-check {
  animation: bounce-check 0.8s ease-out;
}

.animate-sparkle-1 {
  animation: sparkle-1 0.6s ease-out;
}

.animate-sparkle-2 {
  animation: sparkle-2 0.7s ease-out 0.1s;
}

.animate-sparkle-3 {
  animation: sparkle-3 0.8s ease-out 0.2s;
}

.animate-sparkle-4 {
  animation: sparkle-4 0.6s ease-out 0.3s;
}

.animate-sparkle-5 {
  animation: sparkle-5 0.7s ease-out 0.4s;
}

.animate-sparkle-6 {
  animation: sparkle-6 0.6s ease-out 0.5s;
}

.animate-slide-up {
  animation: slide-up 0.4s ease-out;
}

.animate-float-particle {
  animation: float-particle ease-out forwards;
}

.animate-pulse-scale {
  animation: pulse-scale 1s ease-in-out infinite;
}

.animate-shake-1 {
  animation: shake-1 0.6s ease-out;
}

.animate-shake-2 {
  animation: shake-2 0.7s ease-out 0.1s;
}

.animate-shake-3 {
  animation: shake-3 0.8s ease-out 0.2s;
}

.animate-shake-4 {
  animation: shake-4 0.6s ease-out 0.3s;
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}
