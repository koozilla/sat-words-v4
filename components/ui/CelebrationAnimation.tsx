'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, Star, Sparkles } from 'lucide-react';

interface CelebrationAnimationProps {
  isVisible: boolean;
  onComplete?: () => void;
  type?: 'confetti' | 'success' | 'stars';
  message?: string;
}

export default function CelebrationAnimation({ 
  isVisible, 
  onComplete, 
  type = 'success',
  message
}: CelebrationAnimationProps) {
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShowAnimation(true);
      const timer = setTimeout(() => {
        setShowAnimation(false);
        onComplete?.();
      }, 2000); // Animation duration

      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  if (!showAnimation) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
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

      {/* Confetti Animation */}
      {type === 'confetti' && (
        <div className="relative w-full h-full">
          {/* Confetti pieces */}
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            >
              <div
                className={`w-2 h-2 ${
                  ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500'][
                    Math.floor(Math.random() * 5)
                  ]
                }`}
                style={{
                  transform: `rotate(${Math.random() * 360}deg)`,
                }}
              />
            </div>
          ))}
          
          {/* Success message */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="bg-white rounded-full p-4 shadow-lg">
              <CheckCircle className="h-16 w-16 text-green-500 animate-pulse" />
              {message && (
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2">
                  <div className="bg-white rounded-lg px-4 py-2 shadow-lg">
                    <span className="text-lg font-bold text-gray-800">{message}</span>
                  </div>
                </div>
              )}
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

      {/* Overlay for better visibility */}
      <div className="absolute inset-0 bg-black bg-opacity-10" />
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

.animate-confetti {
  animation: confetti linear forwards;
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}
