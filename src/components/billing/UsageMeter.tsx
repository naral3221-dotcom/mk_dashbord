'use client';

export interface UsageMeterProps {
  label: string;
  current: number;
  limit: number;
}

export function UsageMeter({ label, current, limit }: UsageMeterProps) {
  const isUnlimited = limit === -1;
  const percentage = isUnlimited ? 0 : Math.min((current / limit) * 100, 100);
  const isNearLimit = !isUnlimited && percentage >= 80;
  const isAtLimit = !isUnlimited && current >= limit;

  return (
    <div data-testid="usage-meter" className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span data-testid="usage-text" className={isAtLimit ? 'text-red-600 font-medium' : 'text-gray-600'}>
          {current} / {isUnlimited ? '\u221E' : limit}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-2 w-full rounded-full bg-gray-200">
          <div
            data-testid="usage-bar"
            className={`h-2 rounded-full transition-all ${
              isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-yellow-500' : 'bg-blue-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}
