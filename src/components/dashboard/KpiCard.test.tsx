import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KpiCard } from './KpiCard';

describe('KpiCard', () => {
  it('should render label and formatted currency value', () => {
    render(<KpiCard label="Total Spend" value={1234.56} format="currency" />);

    expect(screen.getByText('Total Spend')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-value')).toHaveTextContent('$1,234.56');
  });

  it('should render formatted number value', () => {
    render(<KpiCard label="Impressions" value={12345} format="number" />);

    expect(screen.getByTestId('kpi-value')).toHaveTextContent('12,345');
  });

  it('should render formatted percent value', () => {
    render(<KpiCard label="CTR" value={5.23} format="percent" />);

    expect(screen.getByTestId('kpi-value')).toHaveTextContent('5.23%');
  });

  it('should render formatted ratio value', () => {
    render(<KpiCard label="ROAS" value={2.5} format="ratio" />);

    expect(screen.getByTestId('kpi-value')).toHaveTextContent('2.50x');
  });

  it('should render compact number value', () => {
    render(<KpiCard label="Impressions" value={1500000} format="compact" />);

    expect(screen.getByTestId('kpi-value')).toHaveTextContent('1.5M');
  });

  it('should show positive change with up arrow and green color', () => {
    render(<KpiCard label="Spend" value={1000} format="currency" changePercent={12.5} />);

    const change = screen.getByTestId('kpi-change');
    expect(change).toHaveTextContent('↑12.5%');
    expect(change).toHaveClass('text-green-600');
  });

  it('should show negative change with down arrow and red color', () => {
    render(<KpiCard label="Spend" value={1000} format="currency" changePercent={-8.3} />);

    const change = screen.getByTestId('kpi-change');
    expect(change).toHaveTextContent('↓8.3%');
    expect(change).toHaveClass('text-red-600');
  });

  it('should show zero change without arrow', () => {
    render(<KpiCard label="Spend" value={1000} format="currency" changePercent={0} />);

    const change = screen.getByTestId('kpi-change');
    expect(change).toHaveTextContent('0.0%');
    expect(change).toHaveClass('text-muted-foreground');
  });

  it('should not render change when changePercent is undefined', () => {
    render(<KpiCard label="Spend" value={1000} format="currency" />);

    expect(screen.queryByTestId('kpi-change')).not.toBeInTheDocument();
  });
});
