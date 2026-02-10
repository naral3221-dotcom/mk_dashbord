'use client';

import { Platform } from '@/domain/entities/types';

export interface PlatformFilterProps {
  selectedPlatform: Platform | null;
  onPlatformChange: (platform: Platform | null) => void;
}

const PLATFORM_OPTIONS: { value: Platform | null; label: string }[] = [
  { value: null, label: 'All Platforms' },
  { value: Platform.META, label: 'META' },
  { value: Platform.GOOGLE, label: 'Google Ads' },
  { value: Platform.TIKTOK, label: 'TikTok Ads' },
  { value: Platform.NAVER, label: 'Naver Ads' },
];

export function PlatformFilter({ selectedPlatform, onPlatformChange }: PlatformFilterProps) {
  return (
    <div className="flex gap-2" data-testid="platform-filter">
      {PLATFORM_OPTIONS.map((option) => (
        <button
          key={option.label}
          onClick={() => onPlatformChange(option.value)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            selectedPlatform === option.value
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          data-testid={`platform-filter-${option.value ?? 'all'}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
