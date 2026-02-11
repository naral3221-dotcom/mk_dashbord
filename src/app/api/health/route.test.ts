import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQueryRaw = vi.fn();

vi.mock('@/infrastructure/database/prisma', () => ({
  getPrisma: () => ({
    $queryRaw: mockQueryRaw,
  }),
}));

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return healthy status when database is connected', async () => {
    mockQueryRaw.mockResolvedValue([{ '?column?': 1 }]);

    const { GET } = await import('./route');
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('healthy');
    expect(body.database).toBe('connected');
    expect(body.timestamp).toBeDefined();
    expect(typeof body.uptime).toBe('number');
  });

  it('should return unhealthy status when database is disconnected', async () => {
    mockQueryRaw.mockRejectedValue(new Error('Connection refused'));

    const { GET } = await import('./route');
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe('unhealthy');
    expect(body.database).toBe('disconnected');
  });

  it('should include version and uptime in response', async () => {
    mockQueryRaw.mockResolvedValue([{ '?column?': 1 }]);

    const { GET } = await import('./route');
    const response = await GET();
    const body = await response.json();

    expect(body.version).toBeDefined();
    expect(body.uptime).toBeGreaterThanOrEqual(0);
  });
});
