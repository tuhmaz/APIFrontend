'use client';

import { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import SafeResponsiveContainer from '@/components/charts/SafeResponsiveContainer';

const data = [
  { name: 'يناير', revenue: 4000, orders: 2400 },
  { name: 'فبراير', revenue: 3000, orders: 1398 },
  { name: 'مارس', revenue: 2000, orders: 9800 },
  { name: 'أبريل', revenue: 2780, orders: 3908 },
  { name: 'مايو', revenue: 1890, orders: 4800 },
  { name: 'يونيو', revenue: 2390, orders: 3800 },
  { name: 'يوليو', revenue: 3490, orders: 4300 },
  { name: 'أغسطس', revenue: 4000, orders: 2400 },
  { name: 'سبتمبر', revenue: 3000, orders: 1398 },
  { name: 'أكتوبر', revenue: 2000, orders: 9800 },
  { name: 'نوفمبر', revenue: 2780, orders: 3908 },
  { name: 'ديسمبر', revenue: 3890, orders: 4800 },
];

export default function RevenueChart() {
  const [activeTab, setActiveTab] = useState<'revenue' | 'orders'>('revenue');

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>تحليل الإيرادات</CardTitle>
        <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
          <button
            onClick={() => setActiveTab('revenue')}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
              activeTab === 'revenue'
                ? 'bg-primary text-white'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            الإيرادات
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
              activeTab === 'orders'
                ? 'bg-primary text-white'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            الطلبات
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full min-w-0">
          <SafeResponsiveContainer width="100%" height="100%" minHeight={320}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                }}
              />
              <Area
                type="monotone"
                dataKey={activeTab}
                stroke={activeTab === 'revenue' ? '#3b82f6' : '#8b5cf6'}
                strokeWidth={2}
                fill={`url(#color${activeTab === 'revenue' ? 'Revenue' : 'Orders'})`}
              />
            </AreaChart>
          </SafeResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
