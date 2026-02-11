'use client';

import { Plan } from '@/domain/entities/types';
import { PricingCard } from './PricingCard';

export interface PricingTableProps {
  currentPlan?: Plan;
  onSelectPlan?: (plan: Plan) => void;
}

const plans = [
  {
    plan: Plan.FREE,
    name: '무료',
    price: '$0',
    description: '기본 분석으로 시작하세요',
    features: [
      '광고 계정 1개',
      '팀 멤버 2명',
      'META 플랫폼만',
      '30일 데이터 보관',
    ],
  },
  {
    plan: Plan.PRO,
    name: '프로',
    price: '$49/월',
    description: '성장하는 마케팅 팀을 위한 플랜',
    features: [
      '광고 계정 최대 10개',
      '팀 멤버 최대 20명',
      'META, Google Ads & TikTok Ads',
      '1년 데이터 보관',
      '자동 동기화',
      '데이터 내보내기',
    ],
    highlighted: true,
  },
  {
    plan: Plan.ENTERPRISE,
    name: '엔터프라이즈',
    price: '$199/월',
    description: '대규모 조직을 위한 플랜',
    features: [
      '무제한 광고 계정',
      '무제한 팀 멤버',
      '5개 플랫폼 전체',
      '무제한 데이터 보관',
      '자동 동기화',
      '데이터 내보내기',
      '우선 지원',
    ],
  },
];

export function PricingTable({ currentPlan = Plan.FREE, onSelectPlan }: PricingTableProps) {
  return (
    <div data-testid="pricing-table" className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
      {plans.map((p) => (
        <PricingCard
          key={p.plan}
          plan={p.plan}
          name={p.name}
          price={p.price}
          description={p.description}
          features={p.features}
          isCurrentPlan={p.plan === currentPlan}
          highlighted={p.highlighted}
          onSelect={() => onSelectPlan?.(p.plan)}
          ctaText={p.plan === Plan.FREE ? '무료 가입' : '업그레이드'}
        />
      ))}
    </div>
  );
}
