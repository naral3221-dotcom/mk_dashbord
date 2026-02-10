import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatRatio,
  formatCompactNumber,
  formatDate,
} from './formatters';

describe('formatters', () => {
  describe('formatCurrency', () => {
    it('should format positive amounts with dollar sign and commas', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
    });

    it('should format zero as $0.00', () => {
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('should format large amounts with commas', () => {
      expect(formatCurrency(1000000)).toBe('$1,000,000.00');
    });
  });

  describe('formatNumber', () => {
    it('should format with commas', () => {
      expect(formatNumber(12345)).toBe('12,345');
    });

    it('should format zero', () => {
      expect(formatNumber(0)).toBe('0');
    });
  });

  describe('formatPercent', () => {
    it('should format percentage with two decimals', () => {
      expect(formatPercent(5.234)).toBe('5.23%');
    });

    it('should format zero percent', () => {
      expect(formatPercent(0)).toBe('0.00%');
    });
  });

  describe('formatRatio', () => {
    it('should format ratio with x suffix', () => {
      expect(formatRatio(2.5)).toBe('2.50x');
    });

    it('should format zero ratio', () => {
      expect(formatRatio(0)).toBe('0.00x');
    });
  });

  describe('formatCompactNumber', () => {
    it('should return small numbers as-is', () => {
      expect(formatCompactNumber(999)).toBe('999');
    });

    it('should format thousands as K', () => {
      expect(formatCompactNumber(1500)).toBe('1.5K');
    });

    it('should format millions as M', () => {
      expect(formatCompactNumber(3400000)).toBe('3.4M');
    });

    it('should format billions as B', () => {
      expect(formatCompactNumber(1500000000)).toBe('1.5B');
    });
  });

  describe('formatDate', () => {
    it('should format YYYY-MM-DD as MM/DD', () => {
      expect(formatDate('2024-01-15')).toBe('01/15');
    });

    it('should handle different months and days', () => {
      expect(formatDate('2024-12-03')).toBe('12/03');
    });
  });
});
