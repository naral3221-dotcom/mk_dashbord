import { Platform } from '@/domain/entities/types';

const PLATFORM_CONFIG: Record<Platform, { label: string; color: string }> = {
  [Platform.META]: { label: 'META', color: 'bg-blue-100 text-blue-800' },
  [Platform.GOOGLE]: { label: 'Google', color: 'bg-red-100 text-red-800' },
  [Platform.TIKTOK]: { label: 'TikTok', color: 'bg-gray-100 text-gray-800' },
  [Platform.NAVER]: { label: 'Naver', color: 'bg-green-100 text-green-800' },
  [Platform.KAKAO]: { label: 'Kakao', color: 'bg-yellow-100 text-yellow-800' },
};

export interface PlatformBadgeProps {
  platform: Platform;
}

export function PlatformBadge({ platform }: PlatformBadgeProps) {
  const config = PLATFORM_CONFIG[platform];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.color}`}
      data-testid={`platform-badge-${platform}`}
    >
      {config.label}
    </span>
  );
}
