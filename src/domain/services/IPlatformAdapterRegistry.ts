import { Platform } from '../entities/types';
import { IAdPlatformClient } from './IAdPlatformClient';

export interface IPlatformAdapterRegistry {
  getAdapter(platform: Platform): IAdPlatformClient;
  hasAdapter(platform: Platform): boolean;
  getSupportedPlatforms(): Platform[];
}
