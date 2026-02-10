import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InMemoryCacheService } from './InMemoryCacheService';

describe('InMemoryCacheService', () => {
  let cache: InMemoryCacheService;

  beforeEach(() => {
    vi.useFakeTimers();
    cache = new InMemoryCacheService();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return null for non-existent key', async () => {
    const result = await cache.get('non-existent');

    expect(result).toBeNull();
  });

  it('should store and retrieve a value', async () => {
    await cache.set('token', 'abc123', 60);

    const result = await cache.get<string>('token');

    expect(result).toBe('abc123');
  });

  it('should store and retrieve complex objects', async () => {
    const data = {
      userId: 'user-1',
      accounts: [{ id: 'acc-1', name: 'Test Account' }],
      metadata: { lastSync: '2026-01-01' },
    };

    await cache.set('user-data', data, 300);

    const result = await cache.get<typeof data>('user-data');

    expect(result).toEqual(data);
  });

  it('should return null for expired entries', async () => {
    await cache.set('ephemeral', 'value', 10);

    // Still valid
    const beforeExpiry = await cache.get<string>('ephemeral');
    expect(beforeExpiry).toBe('value');

    // Advance time past TTL
    vi.advanceTimersByTime(11_000);

    const afterExpiry = await cache.get<string>('ephemeral');
    expect(afterExpiry).toBeNull();
  });

  it('should overwrite existing entries', async () => {
    await cache.set('key', 'first', 60);
    await cache.set('key', 'second', 120);

    const result = await cache.get<string>('key');

    expect(result).toBe('second');
  });

  it('should delete entries', async () => {
    await cache.set('to-delete', 'value', 60);
    expect(await cache.get<string>('to-delete')).toBe('value');

    await cache.delete('to-delete');

    expect(await cache.get<string>('to-delete')).toBeNull();
  });

  it('should throw on non-positive TTL', async () => {
    await expect(cache.set('key', 'value', 0)).rejects.toThrow('TTL must be positive');
    await expect(cache.set('key', 'value', -5)).rejects.toThrow('TTL must be positive');
  });

  it('cleanup should remove expired entries', async () => {
    await cache.set('short-lived', 'a', 5);
    await cache.set('long-lived', 'b', 300);

    expect(cache.size).toBe(2);

    // Advance past short-lived TTL but not long-lived
    vi.advanceTimersByTime(6_000);

    cache.cleanup();

    expect(cache.size).toBe(1);
    expect(await cache.get<string>('short-lived')).toBeNull();
    expect(await cache.get<string>('long-lived')).toBe('b');
  });

  it('clear should remove all entries', async () => {
    await cache.set('key1', 'value1', 60);
    await cache.set('key2', 'value2', 60);
    await cache.set('key3', 'value3', 60);

    expect(cache.size).toBe(3);

    cache.clear();

    expect(cache.size).toBe(0);
    expect(await cache.get<string>('key1')).toBeNull();
    expect(await cache.get<string>('key2')).toBeNull();
    expect(await cache.get<string>('key3')).toBeNull();
  });

  it('should handle multiple independent keys', async () => {
    await cache.set('alpha', 1, 60);
    await cache.set('beta', 'two', 60);
    await cache.set('gamma', { three: true }, 60);

    expect(await cache.get<number>('alpha')).toBe(1);
    expect(await cache.get<string>('beta')).toBe('two');
    expect(await cache.get<{ three: boolean }>('gamma')).toEqual({ three: true });

    // Deleting one should not affect others
    await cache.delete('beta');

    expect(await cache.get<number>('alpha')).toBe(1);
    expect(await cache.get<string>('beta')).toBeNull();
    expect(await cache.get<{ three: boolean }>('gamma')).toEqual({ three: true });
  });
});
