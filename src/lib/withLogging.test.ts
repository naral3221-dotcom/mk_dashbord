import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from './withLogging';

const mockInfo = vi.fn();
const mockWarn = vi.fn();
const mockError = vi.fn();
const mockChild = vi.fn();

vi.mock('@/infrastructure/logging', () => ({
  getLogger: () => ({
    info: mockInfo,
    warn: mockWarn,
    error: mockError,
    debug: vi.fn(),
    child: mockChild,
  }),
}));

describe('withLogging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChild.mockReturnValue({
      info: mockInfo,
      warn: mockWarn,
      error: mockError,
      debug: vi.fn(),
      child: mockChild,
    });
  });

  function createRequest(method: string, path: string): NextRequest {
    return new NextRequest(new URL(path, 'http://localhost:3000'), { method });
  }

  it('should log request start and completion for successful response', async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }, { status: 200 }));
    const wrappedHandler = withLogging(handler);
    const req = createRequest('GET', '/api/test');

    const response = await wrappedHandler(req);

    expect(response.status).toBe(200);
    expect(mockChild).toHaveBeenCalledWith({ method: 'GET', url: '/api/test' });
    expect(mockInfo).toHaveBeenCalledWith('Request started');
    expect(mockInfo).toHaveBeenCalledWith('Request completed', expect.objectContaining({ status: 200 }));
  });

  it('should log warning for 4xx responses', async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ error: 'Not found' }, { status: 404 }));
    const wrappedHandler = withLogging(handler);
    const req = createRequest('GET', '/api/test');

    await wrappedHandler(req);

    expect(mockWarn).toHaveBeenCalledWith(
      'Request completed with client error',
      expect.objectContaining({ status: 404 }),
    );
  });

  it('should log error for 5xx responses', async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ error: 'Server error' }, { status: 500 }));
    const wrappedHandler = withLogging(handler);
    const req = createRequest('POST', '/api/test');

    await wrappedHandler(req);

    expect(mockError).toHaveBeenCalledWith(
      'Request completed with server error',
      expect.objectContaining({ status: 500 }),
    );
  });

  it('should log error and rethrow on unhandled exceptions', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('Unexpected crash'));
    const wrappedHandler = withLogging(handler);
    const req = createRequest('POST', '/api/test');

    await expect(wrappedHandler(req)).rejects.toThrow('Unexpected crash');
    expect(mockError).toHaveBeenCalledWith(
      'Request failed with unhandled error',
      expect.objectContaining({ error: 'Unexpected crash' }),
    );
  });

  it('should include duration in log data', async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }, { status: 200 }));
    const wrappedHandler = withLogging(handler);
    const req = createRequest('GET', '/api/test');

    await wrappedHandler(req);

    expect(mockInfo).toHaveBeenCalledWith(
      'Request completed',
      expect.objectContaining({ duration: expect.any(Number) }),
    );
  });
});
