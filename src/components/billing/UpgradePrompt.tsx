'use client';

export interface UpgradePromptProps {
  message: string;
  onUpgrade?: () => void;
}

export function UpgradePrompt({ message, onUpgrade }: UpgradePromptProps) {
  return (
    <div
      data-testid="upgrade-prompt"
      className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-4"
    >
      <p className="text-sm text-amber-800">{message}</p>
      {onUpgrade && (
        <button
          data-testid="upgrade-button"
          onClick={onUpgrade}
          className="ml-4 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
        >
          Upgrade Plan
        </button>
      )}
    </div>
  );
}
