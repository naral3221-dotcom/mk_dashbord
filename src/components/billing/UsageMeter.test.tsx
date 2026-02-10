import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UsageMeter } from './UsageMeter';

describe('UsageMeter', () => {
  it('should render label and usage text', () => {
    render(<UsageMeter label="Ad Accounts" current={3} limit={10} />);

    expect(screen.getByText('Ad Accounts')).toBeInTheDocument();
    expect(screen.getByTestId('usage-text')).toHaveTextContent('3 / 10');
  });

  it('should show red bar and red text when at limit', () => {
    render(<UsageMeter label="Ad Accounts" current={10} limit={10} />);

    const bar = screen.getByTestId('usage-bar');
    expect(bar).toHaveClass('bg-red-500');

    const text = screen.getByTestId('usage-text');
    expect(text).toHaveClass('text-red-600');
  });

  it('should show yellow bar when near limit (80%+)', () => {
    render(<UsageMeter label="Ad Accounts" current={8} limit={10} />);

    const bar = screen.getByTestId('usage-bar');
    expect(bar).toHaveClass('bg-yellow-500');
  });

  it('should show infinity symbol for unlimited (-1) and no progress bar', () => {
    render(<UsageMeter label="Ad Accounts" current={5} limit={-1} />);

    expect(screen.getByTestId('usage-text')).toHaveTextContent('5 / \u221E');
    expect(screen.queryByTestId('usage-bar')).not.toBeInTheDocument();
  });
});
