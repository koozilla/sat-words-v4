'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, UserPlus, Save } from 'lucide-react';

interface GuestModeBannerProps {
  onDismiss?: () => void;
  showConversionCTA?: boolean;
  masteredWords?: number;
}

export default function GuestModeBanner({ 
  onDismiss, 
  showConversionCTA = false,
  masteredWords = 0 
}: GuestModeBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const router = useRouter();

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  const handleSignUp = () => {
    router.push('/auth/signup');
  };

  if (isDismissed) return null;

  return (
    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-400 p-4 mb-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Save className="h-5 w-5 text-yellow-600 mt-0.5" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Guest Mode Active
            </h3>
            <div className="mt-1 text-sm text-yellow-700">
              {showConversionCTA && masteredWords > 0 ? (
                <p>
                  Great work! You've mastered {masteredWords} word{masteredWords !== 1 ? 's' : ''}. 
                  Sign up to save your progress and unlock more tiers.
                </p>
              ) : (
                <p>
                  Your progress won't be saved. Sign up to save your work and unlock all features.
                </p>
              )}
            </div>
            {showConversionCTA && (
              <div className="mt-3">
                <button
                  onClick={handleSignUp}
                  className="bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-700 transition-colors flex items-center"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Sign Up to Save Progress
                </button>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 ml-4 text-yellow-600 hover:text-yellow-800"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
