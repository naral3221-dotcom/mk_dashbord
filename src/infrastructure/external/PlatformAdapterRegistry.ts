import { Platform } from '@/domain/entities/types';
import type { IAdPlatformClient } from '@/domain/services/IAdPlatformClient';
import type { IPlatformAdapterRegistry } from '@/domain/services/IPlatformAdapterRegistry';

export class PlatformAdapterRegistry implements IPlatformAdapterRegistry {
  private readonly adapters: Map<Platform, IAdPlatformClient> = new Map();

  register(adapter: IAdPlatformClient): void {
    this.adapters.set(adapter.platform, adapter);
  }

  getAdapter(platform: Platform): IAdPlatformClient {
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      throw new Error(`No adapter registered for platform: ${platform}`);
    }
    return adapter;
  }

  hasAdapter(platform: Platform): boolean {
    return this.adapters.has(platform);
  }

  getSupportedPlatforms(): Platform[] {
    return Array.from(this.adapters.keys());
  }
}
