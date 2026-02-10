import { ICacheService } from '@/domain/services/ICacheService';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class InMemoryCacheService implements ICacheService {
  private readonly store = new Map<string, CacheEntry<unknown>>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    if (ttlSeconds <= 0) {
      throw new Error('TTL must be positive');
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  /** Remove all expired entries */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  /** Get number of entries (including expired) */
  get size(): number {
    return this.store.size;
  }

  /** Clear all entries */
  clear(): void {
    this.store.clear();
  }
}
