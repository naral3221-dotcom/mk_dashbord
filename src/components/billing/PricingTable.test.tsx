import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PricingTable } from './PricingTable';
import { Plan } from '@/domain/entities/types';

describe('PricingTable', () => {
  it('should render all 3 pricing cards', () => {
    render(<PricingTable />);

    expect(screen.getByTestId('pricing-table')).toBeInTheDocument();
    expect(screen.getByTestId('pricing-card-FREE')).toBeInTheDocument();
    expect(screen.getByTestId('pricing-card-PRO')).toBeInTheDocument();
    expect(screen.getByTestId('pricing-card-ENTERPRISE')).toBeInTheDocument();
  });

  it('should highlight current plan with "Current Plan" badge', () => {
    render(<PricingTable currentPlan={Plan.PRO} />);

    const proCard = screen.getByTestId('pricing-card-PRO');
    expect(proCard.querySelector('[data-testid="current-plan-badge"]')).toBeInTheDocument();

    const freeCard = screen.getByTestId('pricing-card-FREE');
    expect(freeCard.querySelector('[data-testid="pricing-cta"]')).toBeInTheDocument();
  });

  it('should call onSelectPlan with the correct plan when CTA is clicked', () => {
    const onSelectPlan = vi.fn();
    render(<PricingTable currentPlan={Plan.FREE} onSelectPlan={onSelectPlan} />);

    const proCard = screen.getByTestId('pricing-card-PRO');
    const proCta = proCard.querySelector('[data-testid="pricing-cta"]') as HTMLElement;
    fireEvent.click(proCta);

    expect(onSelectPlan).toHaveBeenCalledWith(Plan.PRO);
  });
});
