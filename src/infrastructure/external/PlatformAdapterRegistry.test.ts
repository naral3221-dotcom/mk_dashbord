import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlatformAdapterRegistry } from './PlatformAdapterRegistry';
import { Platform } from '@/domain/entities/types';
import type { IAdPlatformClient } from '@/domain/services/IAdPlatformClient';

function createMockAdapter(platform: Platform): IAdPlatformClient {
  return {
    platform,
    authType: 'oauth' as const,
    getAuthUrl: vi.fn(),
    exchangeCodeForToken: vi.fn(),
    refreshAccessToken: vi.fn(),
    validateToken: vi.fn(),
    getAdAccounts: vi.fn(),
    getCampaigns: vi.fn(),
    getInsights: vi.fn(),
  };
}

describe('PlatformAdapterRegistry', () => {
  let registry: PlatformAdapterRegistry;

  beforeEach(() => {
    registry = new PlatformAdapterRegistry();
  });

  it('should register and getAdapter returns correct adapter', () => {
    const metaAdapter = createMockAdapter(Platform.META);
    registry.register(metaAdapter);

    const result = registry.getAdapter(Platform.META);

    expect(result).toBe(metaAdapter);
  });

  it('should throw for unregistered platform in getAdapter', () => {
    expect(() => registry.getAdapter(Platform.GOOGLE)).toThrow(
      'No adapter registered for platform: GOOGLE',
    );
  });

  it('should return true from hasAdapter for registered platform', () => {
    const metaAdapter = createMockAdapter(Platform.META);
    registry.register(metaAdapter);

    expect(registry.hasAdapter(Platform.META)).toBe(true);
  });

  it('should return false from hasAdapter for unregistered platform', () => {
    expect(registry.hasAdapter(Platform.TIKTOK)).toBe(false);
  });

  it('should return all registered platforms from getSupportedPlatforms', () => {
    const metaAdapter = createMockAdapter(Platform.META);
    const googleAdapter = createMockAdapter(Platform.GOOGLE);
    registry.register(metaAdapter);
    registry.register(googleAdapter);

    const platforms = registry.getSupportedPlatforms();

    expect(platforms).toHaveLength(2);
    expect(platforms).toContain(Platform.META);
    expect(platforms).toContain(Platform.GOOGLE);
  });

  it('should return empty array from getSupportedPlatforms initially', () => {
    const platforms = registry.getSupportedPlatforms();

    expect(platforms).toEqual([]);
  });

  it('should support registering multiple adapters for different platforms', () => {
    const metaAdapter = createMockAdapter(Platform.META);
    const googleAdapter = createMockAdapter(Platform.GOOGLE);
    const tiktokAdapter = createMockAdapter(Platform.TIKTOK);

    registry.register(metaAdapter);
    registry.register(googleAdapter);
    registry.register(tiktokAdapter);

    expect(registry.getAdapter(Platform.META)).toBe(metaAdapter);
    expect(registry.getAdapter(Platform.GOOGLE)).toBe(googleAdapter);
    expect(registry.getAdapter(Platform.TIKTOK)).toBe(tiktokAdapter);
  });

  it('should overwrite earlier registration when registering same platform again', () => {
    const firstAdapter = createMockAdapter(Platform.META);
    const secondAdapter = createMockAdapter(Platform.META);

    registry.register(firstAdapter);
    registry.register(secondAdapter);

    const result = registry.getAdapter(Platform.META);

    expect(result).toBe(secondAdapter);
    expect(result).not.toBe(firstAdapter);
    expect(registry.getSupportedPlatforms()).toHaveLength(1);
  });
});
