'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Eye,
  Clock,
  Globe,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { dashboardService } from '@/lib/api/services';
import { VisitorAnalyticsData } from '@/types';
import { usePermissionGuard } from '@/hooks/usePermissionGuard';
import AccessDenied from '@/components/common/AccessDenied';
import SafeResponsiveContainer from '@/components/charts/SafeResponsiveContainer';

export default function AnalyticsPage() {
  const { isAuthorized } = usePermissionGuard('manage analytics');
  const [data, setData] = useState<VisitorAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only fetch if authorized (or null which means loading auth)
    // We can also let the guard handle redirect, but to prevent API error:
    if (isAuthorized === false) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await dashboardService.getAnalytics(30);
        setData(res);
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isAuthorized]);

  // Permission check after all hooks
  if (isAuthorized === false) {
    return <AccessDenied />;
  }

  if (isAuthorized === null || loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Process Country Data
  const totalVisitorsForCountries = data.country_stats.reduce((acc, curr) => acc + curr.count, 0);
  const countryData = data.country_stats.map(c => ({
    country: c.country,
    visitors: c.count,
    percentage: totalVisitorsForCountries > 0 ? Math.round((c.count / totalVisitorsForCountries) * 100) : 0
  }));

  // Process Stats
  const stats = [
    {
      title: 'الزوار اليوم',
      value: data.visitor_stats.total_today.toLocaleString(),
      change: data.visitor_stats.change,
      changeType: data.visitor_stats.change >= 0 ? 'increase' : 'decrease',
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      title: 'الزوار النشطون حالياً',
      value: data.visitor_stats.current.toLocaleString(),
      change: 0,
      changeType: 'increase', // Neutral or N/A
      icon: Eye,
      color: 'bg-purple-500',
    },
    {
      title: 'إجمالي الأعضاء',
      value: data.user_stats.total.toLocaleString(),
      change: data.user_stats.new_today,
      changeType: 'increase',
      icon: Users,
      color: 'bg-green-500',
    },
    {
      title: 'الأعضاء النشطون',
      value: data.user_stats.active.toLocaleString(),
      change: 0,
      changeType: 'increase',
      icon: Clock,
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">التحليلات</h1>
          <p className="text-muted-foreground">تتبع أداء موقعك وتحليل سلوك الزوار</p>
        </div>
        <select className="bg-card border border-border rounded-lg px-3 py-2 text-sm">
          <option>آخر 30 يوم</option>
        </select>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardContent>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <div className={cn(
                      'flex items-center gap-1 text-sm',
                      stat.changeType === 'increase' ? 'text-success' : 'text-error'
                    )}>
                      {stat.changeType === 'increase' ? (
                        <ArrowUp className="w-4 h-4" />
                      ) : (
                        <ArrowDown className="w-4 h-4" />
                      )}
                      <span>{Math.abs(stat.change)}%</span>
                    </div>
                  </div>
                  <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', stat.color)}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Visitors Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>الزوار ومشاهدات الصفحة (آخر 30 يوم)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <SafeResponsiveContainer width="100%" height="100%" minHeight={320}>
                <AreaChart data={data.chart_data}>
                  <defs>
                    <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorPageViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="visitors"
                    name="الزوار"
                    stroke="#3b82f6"
                    fill="url(#colorVisitors)"
                  />
                  <Area
                    type="monotone"
                    dataKey="pageViews"
                    name="المشاهدات"
                    stroke="#8b5cf6"
                    fill="url(#colorPageViews)"
                  />
                </AreaChart>
              </SafeResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Device Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>توزيع الأجهزة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full min-w-0">
              <SafeResponsiveContainer width="100%" height="100%" minHeight={256}>
                <PieChart>
                  <Pie
                    data={data.device_stats}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {data.device_stats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </SafeResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-4 flex-wrap">
              {data.device_stats.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-muted-foreground">
                    {item.name} ({item.value}%)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Traffic Sources */}
        <Card>
          <CardHeader>
            <CardTitle>مصادر الزيارات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.traffic_sources.map((source, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="font-medium">{source.source}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground">{source.visits.toLocaleString()}</span>
                    {/* Change logic if available, currently mocked as 0 or static */}
                    {source.change !== 0 && (
                      <span className={cn(
                        'flex items-center gap-1 text-sm',
                        source.change > 0 ? 'text-success' : 'text-error'
                      )}>
                        {source.change > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                        {Math.abs(source.change)}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Countries */}
        <Card>
          <CardHeader>
            <CardTitle>أعلى الدول</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {countryData.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{item.country}</span>
                    </div>
                    <span className="text-muted-foreground">
                      {item.visitors.toLocaleString()} ({item.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.percentage}%` }}
                      transition={{ duration: 1, delay: index * 0.1 }}
                      className="h-full bg-primary rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
