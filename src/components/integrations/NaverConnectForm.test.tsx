import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NaverConnectForm } from './NaverConnectForm';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('NaverConnectForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render form with 3 input fields', () => {
    render(<NaverConnectForm />);

    expect(screen.getByLabelText('API 키')).toBeInTheDocument();
    expect(screen.getByLabelText('API 시크릿')).toBeInTheDocument();
    expect(screen.getByLabelText('고객 ID')).toBeInTheDocument();
  });

  it('should show error when submitting empty form', async () => {
    render(<NaverConnectForm />);

    const submitButton = screen.getByTestId('naver-submit-button');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId('naver-error')).toHaveTextContent('모든 필드를 입력해주세요');
    });

    // Fetch should not be called
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should call API on valid submit', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'acc-1', accountName: 'Test Account' }),
    });

    render(<NaverConnectForm />);

    fireEvent.change(screen.getByLabelText('API 키'), {
      target: { value: 'test-api-key' },
    });
    fireEvent.change(screen.getByLabelText('API 시크릿'), {
      target: { value: 'test-api-secret' },
    });
    fireEvent.change(screen.getByLabelText('고객 ID'), {
      target: { value: 'test-customer-id' },
    });

    const submitButton = screen.getByTestId('naver-submit-button');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/naver/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: 'test-api-key',
          apiSecret: 'test-api-secret',
          customerId: 'test-customer-id',
        }),
      });
    });
  });

  it('should show success message on successful connection', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'acc-1', accountName: 'Test Account' }),
    });

    render(<NaverConnectForm />);

    fireEvent.change(screen.getByLabelText('API 키'), {
      target: { value: 'key' },
    });
    fireEvent.change(screen.getByLabelText('API 시크릿'), {
      target: { value: 'secret' },
    });
    fireEvent.change(screen.getByLabelText('고객 ID'), {
      target: { value: 'cust-1' },
    });

    fireEvent.click(screen.getByTestId('naver-submit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('naver-success')).toHaveTextContent(
        '연결에 성공했습니다!',
      );
    });
  });

  it('should show error message on failed connection', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Invalid Naver API credentials' }),
    });

    render(<NaverConnectForm />);

    fireEvent.change(screen.getByLabelText('API 키'), {
      target: { value: 'bad-key' },
    });
    fireEvent.change(screen.getByLabelText('API 시크릿'), {
      target: { value: 'bad-secret' },
    });
    fireEvent.change(screen.getByLabelText('고객 ID'), {
      target: { value: 'bad-cust' },
    });

    fireEvent.click(screen.getByTestId('naver-submit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('naver-error')).toHaveTextContent(
        'Invalid Naver API credentials',
      );
    });
  });

  it('should disable button while loading', async () => {
    // Create a promise that we control to keep the fetch in pending state
    let resolvePromise: (value: unknown) => void;
    const fetchPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockFetch.mockReturnValueOnce(fetchPromise);

    render(<NaverConnectForm />);

    fireEvent.change(screen.getByLabelText('API 키'), {
      target: { value: 'key' },
    });
    fireEvent.change(screen.getByLabelText('API 시크릿'), {
      target: { value: 'secret' },
    });
    fireEvent.change(screen.getByLabelText('고객 ID'), {
      target: { value: 'cust' },
    });

    fireEvent.click(screen.getByTestId('naver-submit-button'));

    await waitFor(() => {
      const button = screen.getByTestId('naver-submit-button');
      expect(button).toBeDisabled();
      expect(button).toHaveTextContent('연결 중...');
    });

    // Resolve to clean up
    resolvePromise!({
      ok: true,
      json: async () => ({}),
    });
  });

  it('should update input fields correctly', () => {
    render(<NaverConnectForm />);

    const apiKeyInput = screen.getByLabelText('API 키') as HTMLInputElement;
    const apiSecretInput = screen.getByLabelText('API 시크릿') as HTMLInputElement;
    const customerIdInput = screen.getByLabelText('고객 ID') as HTMLInputElement;

    fireEvent.change(apiKeyInput, { target: { value: 'my-api-key' } });
    fireEvent.change(apiSecretInput, { target: { value: 'my-api-secret' } });
    fireEvent.change(customerIdInput, { target: { value: 'my-customer-id' } });

    expect(apiKeyInput.value).toBe('my-api-key');
    expect(apiSecretInput.value).toBe('my-api-secret');
    expect(customerIdInput.value).toBe('my-customer-id');
  });

  it('should use password type for API Secret field', () => {
    render(<NaverConnectForm />);

    const apiSecretInput = screen.getByLabelText('API 시크릿') as HTMLInputElement;
    expect(apiSecretInput.type).toBe('password');
  });
});
