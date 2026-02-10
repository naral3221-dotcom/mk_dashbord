import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UpgradePrompt } from './UpgradePrompt';

describe('UpgradePrompt', () => {
  it('should render the message', () => {
    render(<UpgradePrompt message="You have reached your ad account limit." />);

    expect(screen.getByTestId('upgrade-prompt')).toBeInTheDocument();
    expect(screen.getByText('You have reached your ad account limit.')).toBeInTheDocument();
  });

  it('should show upgrade button when onUpgrade is provided', () => {
    const onUpgrade = vi.fn();
    render(<UpgradePrompt message="Upgrade needed" onUpgrade={onUpgrade} />);

    expect(screen.getByTestId('upgrade-button')).toHaveTextContent('Upgrade Plan');
  });

  it('should call onUpgrade when button is clicked', () => {
    const onUpgrade = vi.fn();
    render(<UpgradePrompt message="Upgrade needed" onUpgrade={onUpgrade} />);

    fireEvent.click(screen.getByTestId('upgrade-button'));
    expect(onUpgrade).toHaveBeenCalledTimes(1);
  });
});
