import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PinoLogger } from './PinoLogger';
import { ILogger } from '@/domain/services/ILogger';

// Mock pino at module level
const mockChild = vi.fn();
const mockInfo = vi.fn();
const mockWarn = vi.fn();
const mockError = vi.fn();
const mockDebug = vi.fn();

const mockPinoInstance = {
  info: mockInfo,
  warn: mockWarn,
  error: mockError,
  debug: mockDebug,
  child: mockChild,
};

vi.mock('pino', () => ({
  default: vi.fn(() => mockPinoInstance),
}));

describe('PinoLogger', () => {
  let logger: PinoLogger;

  beforeEach(() => {
    vi.clearAllMocks();
    mockChild.mockReturnValue({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      child: vi.fn(),
    });
    // Create logger with the mock pino instance cast as any
    logger = new PinoLogger(mockPinoInstance as never);
  });

  it('should implement ILogger interface', () => {
    const iLogger: ILogger = logger;
    expect(iLogger).toBeDefined();
    expect(typeof iLogger.info).toBe('function');
    expect(typeof iLogger.warn).toBe('function');
    expect(typeof iLogger.error).toBe('function');
    expect(typeof iLogger.debug).toBe('function');
    expect(typeof iLogger.child).toBe('function');
  });

  it('should call pino info with message only', () => {
    logger.info('test message');
    expect(mockInfo).toHaveBeenCalledWith('test message');
  });

  it('should call pino info with message and data', () => {
    logger.info('test message', { userId: '123' });
    expect(mockInfo).toHaveBeenCalledWith({ userId: '123' }, 'test message');
  });

  it('should call pino warn with message and data', () => {
    logger.warn('warning message', { code: 'WARN_01' });
    expect(mockWarn).toHaveBeenCalledWith({ code: 'WARN_01' }, 'warning message');
  });

  it('should call pino error with message only', () => {
    logger.error('error occurred');
    expect(mockError).toHaveBeenCalledWith('error occurred');
  });

  it('should call pino debug with message and data', () => {
    logger.debug('debug info', { detail: 'value' });
    expect(mockDebug).toHaveBeenCalledWith({ detail: 'value' }, 'debug info');
  });

  it('should create a child logger with bindings', () => {
    const childLogger = logger.child({ requestId: 'req-123' });
    expect(mockChild).toHaveBeenCalledWith({ requestId: 'req-123' });
    expect(childLogger).toBeInstanceOf(PinoLogger);
  });
});
