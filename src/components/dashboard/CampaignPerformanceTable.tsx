'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency, formatNumber, formatPercent, formatRatio } from '@/lib/formatters';
import { PlatformBadge } from './PlatformBadge';
import { Platform } from '@/domain/entities/types';

export interface CampaignRowData {
  campaignId: string;
  campaignName: string;
  status: string;
  platform?: Platform;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  ctr: number;
  cpc: number;
  roas: number;
}

type SortKey = 'campaignName' | 'spend' | 'impressions' | 'clicks' | 'conversions' | 'revenue' | 'ctr' | 'cpc' | 'roas';
type SortDir = 'asc' | 'desc';

export interface CampaignPerformanceTableProps {
  data: CampaignRowData[];
  loading?: boolean;
}

const statusBadge: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  PAUSED: 'bg-yellow-100 text-yellow-800',
  ARCHIVED: 'bg-gray-100 text-gray-800',
  DELETED: 'bg-red-100 text-red-800',
};

export function CampaignPerformanceTable({ data, loading }: CampaignPerformanceTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('spend');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  }, [data, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return '';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Campaign Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[200px] items-center justify-center text-muted-foreground" data-testid="table-loading">
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Campaign Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[200px] items-center justify-center text-muted-foreground" data-testid="table-empty">
            No campaigns found
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Campaign Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button type="button" onClick={() => handleSort('campaignName')} data-testid="sort-name">
                  Name{sortIndicator('campaignName')}
                </button>
              </TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>
                <button type="button" onClick={() => handleSort('spend')} data-testid="sort-spend">
                  Spend{sortIndicator('spend')}
                </button>
              </TableHead>
              <TableHead>
                <button type="button" onClick={() => handleSort('impressions')} data-testid="sort-impressions">
                  Impressions{sortIndicator('impressions')}
                </button>
              </TableHead>
              <TableHead>
                <button type="button" onClick={() => handleSort('clicks')} data-testid="sort-clicks">
                  Clicks{sortIndicator('clicks')}
                </button>
              </TableHead>
              <TableHead>
                <button type="button" onClick={() => handleSort('conversions')} data-testid="sort-conversions">
                  Conv.{sortIndicator('conversions')}
                </button>
              </TableHead>
              <TableHead>
                <button type="button" onClick={() => handleSort('revenue')} data-testid="sort-revenue">
                  Revenue{sortIndicator('revenue')}
                </button>
              </TableHead>
              <TableHead>
                <button type="button" onClick={() => handleSort('ctr')} data-testid="sort-ctr">
                  CTR{sortIndicator('ctr')}
                </button>
              </TableHead>
              <TableHead>
                <button type="button" onClick={() => handleSort('cpc')} data-testid="sort-cpc">
                  CPC{sortIndicator('cpc')}
                </button>
              </TableHead>
              <TableHead>
                <button type="button" onClick={() => handleSort('roas')} data-testid="sort-roas">
                  ROAS{sortIndicator('roas')}
                </button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((row) => (
              <TableRow key={row.campaignId} data-testid={`campaign-row-${row.campaignId}`}>
                <TableCell className="font-medium">{row.campaignName}</TableCell>
                <TableCell>
                  {row.platform && <PlatformBadge platform={row.platform} />}
                </TableCell>
                <TableCell>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge[row.status] ?? 'bg-gray-100'}`}>
                    {row.status}
                  </span>
                </TableCell>
                <TableCell>{formatCurrency(row.spend)}</TableCell>
                <TableCell>{formatNumber(row.impressions)}</TableCell>
                <TableCell>{formatNumber(row.clicks)}</TableCell>
                <TableCell>{formatNumber(row.conversions)}</TableCell>
                <TableCell>{formatCurrency(row.revenue)}</TableCell>
                <TableCell>{formatPercent(row.ctr)}</TableCell>
                <TableCell>{formatCurrency(row.cpc)}</TableCell>
                <TableCell>{formatRatio(row.roas)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
