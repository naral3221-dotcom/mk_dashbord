import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlatformFilter } from './PlatformFilter';
import { Platform } from '@/domain/entities/types';

describe('PlatformFilter', () => {
  it('should render all platform options', () => {
    render(
      <PlatformFilter selectedPlatform={null} onPlatformChange={vi.fn()} />,
    );

    expect(screen.getByTestId('platform-filter')).toBeInTheDocument();
    expect(screen.getByText('전체 플랫폼')).toBeInTheDocument();
    expect(screen.getByText('META')).toBeInTheDocument();
    expect(screen.getByText('Google Ads')).toBeInTheDocument();
    expect(screen.getByText('TikTok Ads')).toBeInTheDocument();
    expect(screen.getByText('Naver Ads')).toBeInTheDocument();
  });

  it('should highlight the selected "전체 플랫폼" button when platform is null', () => {
    render(
      <PlatformFilter selectedPlatform={null} onPlatformChange={vi.fn()} />,
    );

    const allButton = screen.getByTestId('platform-filter-all');
    expect(allButton).toHaveClass('bg-blue-600');
    expect(allButton).toHaveClass('text-white');

    const metaButton = screen.getByTestId('platform-filter-META');
    expect(metaButton).toHaveClass('bg-gray-100');
    expect(metaButton).toHaveClass('text-gray-700');
  });

  it('should highlight the selected platform button', () => {
    render(
      <PlatformFilter selectedPlatform={Platform.META} onPlatformChange={vi.fn()} />,
    );

    const metaButton = screen.getByTestId('platform-filter-META');
    expect(metaButton).toHaveClass('bg-blue-600');
    expect(metaButton).toHaveClass('text-white');

    const allButton = screen.getByTestId('platform-filter-all');
    expect(allButton).toHaveClass('bg-gray-100');
    expect(allButton).toHaveClass('text-gray-700');
  });

  it('should call onPlatformChange with Platform.META when META clicked', () => {
    const handleChange = vi.fn();
    render(
      <PlatformFilter selectedPlatform={null} onPlatformChange={handleChange} />,
    );

    fireEvent.click(screen.getByText('META'));

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith(Platform.META);
  });

  it('should call onPlatformChange with null when "전체 플랫폼" clicked', () => {
    const handleChange = vi.fn();
    render(
      <PlatformFilter selectedPlatform={Platform.GOOGLE} onPlatformChange={handleChange} />,
    );

    fireEvent.click(screen.getByText('전체 플랫폼'));

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith(null);
  });

  it('should call onPlatformChange with correct platform for each button', () => {
    const handleChange = vi.fn();
    render(
      <PlatformFilter selectedPlatform={null} onPlatformChange={handleChange} />,
    );

    fireEvent.click(screen.getByText('Google Ads'));
    expect(handleChange).toHaveBeenCalledWith(Platform.GOOGLE);

    fireEvent.click(screen.getByText('TikTok Ads'));
    expect(handleChange).toHaveBeenCalledWith(Platform.TIKTOK);

    fireEvent.click(screen.getByText('Naver Ads'));
    expect(handleChange).toHaveBeenCalledWith(Platform.NAVER);
  });
});
