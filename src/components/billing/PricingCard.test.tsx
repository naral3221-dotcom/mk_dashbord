import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PricingCard } from './PricingCard';
import { Plan } from '@/domain/entities/types';

describe('PricingCard', () => {
  const defaultProps = {
    plan: Plan.PRO,
    name: 'Pro',
    price: '$49/mo',
    description: 'For growing marketing teams',
    features: ['10 ad accounts', '20 team members', 'Auto sync'],
    isCurrentPlan: false,
  };

  it('should render plan name, price, and features', () => {
    render(<PricingCard {...defaultProps} />);

    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByTestId('pricing-price')).toHaveTextContent('$49/mo');
    expect(screen.getByText('For growing marketing teams')).toBeInTheDocument();
    expect(screen.getByText('10 ad accounts')).toBeInTheDocument();
    expect(screen.getByText('20 team members')).toBeInTheDocument();
    expect(screen.getByText('Auto sync')).toBeInTheDocument();
  });

  it('should show "Current Plan" badge when isCurrentPlan is true', () => {
    render(<PricingCard {...defaultProps} isCurrentPlan={true} />);

    expect(screen.getByTestId('current-plan-badge')).toHaveTextContent('현재 플랜');
    expect(screen.queryByTestId('pricing-cta')).not.toBeInTheDocument();
  });

  it('should show CTA button when not current plan', () => {
    render(<PricingCard {...defaultProps} isCurrentPlan={false} ctaText="Upgrade" />);

    const cta = screen.getByTestId('pricing-cta');
    expect(cta).toHaveTextContent('Upgrade');
    expect(screen.queryByTestId('current-plan-badge')).not.toBeInTheDocument();
  });

  it('should call onSelect when CTA button is clicked', () => {
    const onSelect = vi.fn();
    render(<PricingCard {...defaultProps} onSelect={onSelect} />);

    fireEvent.click(screen.getByTestId('pricing-cta'));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
