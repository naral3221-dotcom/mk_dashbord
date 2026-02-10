import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlatformBadge } from './PlatformBadge';
import { Platform } from '@/domain/entities/types';

describe('PlatformBadge', () => {
  it('should render META badge with correct label and color', () => {
    render(<PlatformBadge platform={Platform.META} />);

    const badge = screen.getByTestId('platform-badge-META');
    expect(badge).toHaveTextContent('META');
    expect(badge).toHaveClass('bg-blue-100');
    expect(badge).toHaveClass('text-blue-800');
  });

  it('should render Google badge with correct label and color', () => {
    render(<PlatformBadge platform={Platform.GOOGLE} />);

    const badge = screen.getByTestId('platform-badge-GOOGLE');
    expect(badge).toHaveTextContent('Google');
    expect(badge).toHaveClass('bg-red-100');
    expect(badge).toHaveClass('text-red-800');
  });

  it('should render TikTok badge with correct label and color', () => {
    render(<PlatformBadge platform={Platform.TIKTOK} />);

    const badge = screen.getByTestId('platform-badge-TIKTOK');
    expect(badge).toHaveTextContent('TikTok');
    expect(badge).toHaveClass('bg-gray-100');
    expect(badge).toHaveClass('text-gray-800');
  });

  it('should render Naver badge with correct label and color', () => {
    render(<PlatformBadge platform={Platform.NAVER} />);

    const badge = screen.getByTestId('platform-badge-NAVER');
    expect(badge).toHaveTextContent('Naver');
    expect(badge).toHaveClass('bg-green-100');
    expect(badge).toHaveClass('text-green-800');
  });

  it('should render Kakao badge with correct label and color', () => {
    render(<PlatformBadge platform={Platform.KAKAO} />);

    const badge = screen.getByTestId('platform-badge-KAKAO');
    expect(badge).toHaveTextContent('Kakao');
    expect(badge).toHaveClass('bg-yellow-100');
    expect(badge).toHaveClass('text-yellow-800');
  });
});
