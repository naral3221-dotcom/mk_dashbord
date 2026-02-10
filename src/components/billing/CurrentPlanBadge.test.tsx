import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CurrentPlanBadge } from './CurrentPlanBadge';
import { Plan } from '@/domain/entities/types';

describe('CurrentPlanBadge', () => {
  it('should render the plan name', () => {
    render(<CurrentPlanBadge plan={Plan.STARTER} />);

    const badge = screen.getByTestId('current-plan-badge');
    expect(badge).toHaveTextContent('STARTER');
  });

  it('should apply correct color for FREE plan', () => {
    render(<CurrentPlanBadge plan={Plan.FREE} />);

    const badge = screen.getByTestId('current-plan-badge');
    expect(badge).toHaveClass('bg-gray-100');
    expect(badge).toHaveClass('text-gray-700');
  });

  it('should apply correct color for PRO plan', () => {
    render(<CurrentPlanBadge plan={Plan.PRO} />);

    const badge = screen.getByTestId('current-plan-badge');
    expect(badge).toHaveClass('bg-purple-100');
    expect(badge).toHaveClass('text-purple-700');
  });
});
