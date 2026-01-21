'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from '@/components/common/AppImage';
import * as LucideIcons from 'lucide-react';
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Search,
  School,
  Home as HomeIcon,
  Info,
  UserPlus,
  BookOpen,
  Clock3,
} from 'lucide-react';
import QuickSearch from '@/components/search/QuickSearch';
import { SchoolClass, Category } from '@/types';
import { calendarService } from '@/lib/api/services/calendar';
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, isToday, parseISO, startOfMonth, startOfWeek, subMonths } from 'date-fns';
import { arSA } from 'date-fns/locale';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { useSettingsStore, useAuthStore } from '@/store/useStore';
import { getStorageUrl } from '@/lib/utils';

interface HomeContentProps {
  country: { id: string; code: string; name: string };
  classes: SchoolClass[];
  categories?: Category[];
  initialSiteName?: string;
  isLoggedIn?: boolean;
  adSettings?: {
    googleAdsDesktop: string;
    googleAdsMobile: string;
    googleAdsDesktop2: string;
    googleAdsMobile2: string;
  };
}

export default function HomeContent({ country, classes, categories, initialSiteName, isLoggedIn = false, adSettings }: HomeContentProps) {
  const { siteName } = useSettingsStore();
  const { isAuthenticated } = useAuthStore();
  const showHeroButtons = !isLoggedIn && !isAuthenticated;

  const resolvedSiteName = (initialSiteName || siteName || '').toString().trim();

  // Ads state - only render on client to avoid hydration issues
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  // --- Calendar Logic ---
  const [calendarDate, setCalendarDate] = useState(() => new Date());

  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventModalDate, setEventModalDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [events, setEvents] = useState<
    { id: number; title: string; description: string; start_date: string; database: string }[]
  >([]);

  const monthStart = useMemo(() => startOfMonth(calendarDate), [calendarDate]);
  const monthEnd = useMemo(() => endOfMonth(monthStart), [monthStart]);
  const startDate = useMemo(() => startOfWeek(monthStart, { weekStartsOn: 0 }), [monthStart]);
  const endDate = useMemo(() => endOfWeek(monthEnd, { weekStartsOn: 0 }), [monthEnd]);

  const calendarDays = useMemo(
    () =>
      eachDayOfInterval({
        start: startDate,
        end: endDate,
      }),
    [startDate, endDate]
  );

  useEffect(() => {
    const fetchMonthEvents = async () => {
      try {
        const start = format(startDate, 'yyyy-MM-dd');
        const end = format(endDate, 'yyyy-MM-dd');
        const res = await calendarService.getHomeEvents({
          database: country.code,
          start,
          end,
        });
        const mapped = (res || [])
          .map((item: any) => ({
            id: Number(item.id),
            title: String(item.title ?? ''),
            description: String(item.extendedProps?.description ?? ''),
            start_date: String(item.start ?? '').split('T')[0],
            database: String(item.extendedProps?.database ?? country.code),
          }))
          .filter((e) => e.title && e.start_date && e.start_date !== 'Invalid Date');
        setEvents(mapped);
      } catch {
        setEvents([]);
      }
    };
    fetchMonthEvents();
  }, [country.code, startDate, endDate]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, typeof events>();
    events.forEach((e) => {
      const list = map.get(e.start_date) || [];
      list.push(e);
      map.set(e.start_date, list);
    });
    return map;
  }, [events]);

  const eventModalEvents = useMemo(
    () => eventsByDate.get(eventModalDate) || [],
    [eventsByDate, eventModalDate]
  );



  const upcomingEvents = useMemo(() => {
    const parsed = events
      .map((e) => ({
        ...e,
        date: new Date(e.start_date),
      }))
      .filter((e) => !Number.isNaN(e.date.getTime()))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    return parsed.slice(0, 4);
  }, [events]);

  // --- UI Constants ---
  const classAccents = [
    'border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-100 hover:border-blue-300',
    'border-emerald-200 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100 hover:border-emerald-300',
    'border-purple-200 text-purple-700 bg-purple-50/50 hover:bg-purple-100 hover:border-purple-300',
    'border-amber-200 text-amber-700 bg-amber-50/50 hover:bg-amber-100 hover:border-amber-300',
    'border-rose-200 text-rose-700 bg-rose-50/50 hover:bg-rose-100 hover:border-rose-300',
    'border-cyan-200 text-cyan-700 bg-cyan-50/50 hover:bg-cyan-100 hover:border-cyan-300',
  ];

  const daysAr = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  // Filter Categories
  const parentCategories = useMemo(() => categories?.filter(c => !c.parent_id).slice(0, 9) || [], [categories]);
  const childrenByParent = useMemo(() => {
    const map = new Map<number, Category[]>();
    categories?.filter(c => c.parent_id).forEach(c => {
      const pid = c.parent_id!;
      const list = map.get(pid) || [];
      list.push(c);
      map.set(pid, list);
    });
    return map;
  }, [categories]);

  return (
    <div className="bg-[#f8f9fa] min-h-screen font-sans">
      {/* 
        1. Hero Section 
        Mimics the blade layout: linear-gradient(226deg, #202c45 0%, #286aad 100%)
      */}
      <section className="relative pt-24 pb-32 lg:pt-32 lg:pb-48 overflow-hidden" 
               style={{ background: 'linear-gradient(226deg, #202c45 0%, #286aad 100%)' }}>
        
        {/* Background Pattern Overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-20"
             style={{ 
               backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)',
               backgroundSize: '32px 32px' 
             }} 
        />

        {/* Animated Shapes */}
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[150px] -right-[150px] w-[500px] h-[500px] rounded-full border border-white/5 opacity-30 pointer-events-none" 
        />
        <motion.div 
          animate={{ rotate: -360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
          className="absolute top-[20%] left-[10%] w-[200px] h-[200px] rounded-full bg-blue-500/20 blur-3xl pointer-events-none" 
        />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-6xl font-bold text-white mb-6 drop-shadow-sm leading-tight"
            >
              منصة <span className="text-[#3498db] inline-block relative">
                {resolvedSiteName}
                <svg className="absolute w-full h-3 -bottom-1 left-0 text-[#3498db]/40" viewBox="0 0 100 10" preserveAspectRatio="none">
                  <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
              </span> التعليمية للمنهاج الدراسي في {country.name}
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-lg md:text-xl text-white/90 mb-10 max-w-2xl mx-auto font-light"
            >
              منصتك التعليمية الشاملة في {country.name}. اكتشف الدروس، الامتحانات، والخطط الدراسية بسهولة.
            </motion.p>
            
            {showHeroButtons && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link
                href="/login"
                className="group relative px-8 py-4 bg-gradient-to-tr from-[#3498db] to-[#2980b9] rounded-full text-white font-bold shadow-lg shadow-blue-900/20 hover:shadow-blue-900/40 hover:-translate-y-0.5 transition-all overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  ابدأ الآن مجاناً
                </span>
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              </Link>
              
              <Link
                href="#features"
                className="px-8 py-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white font-semibold hover:bg-white/20 transition-colors flex items-center gap-2"
              >
                <Info className="w-5 h-5" />
                المزيد عنا
              </Link>
            </motion.div>
            )}
          </div>
        </div>

        {/* Wave Divider */}
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-[0]">
          <svg 
            viewBox="0 0 1440 120" 
            preserveAspectRatio="none" 
            className="relative block w-[calc(100%+2px)] -ml-[1px] h-[60px] md:h-[100px]"
            shapeRendering="geometricPrecision"
          >
            <path 
              d="M0,64L80,69.3C160,75,320,85,480,80C640,75,800,53,960,48C1120,43,1280,53,1360,58.7L1440,64L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z" 
              className="fill-[#f8f9fa]"
            />
            <path
              d="M0,64L80,69.3C160,75,320,85,480,80C640,75,800,53,960,48C1120,43,1280,53,1360,58.7L1440,64L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z"
              className="fill-white/10"
              transform="translate(0,6)"
            />
          </svg>
        </div>
      </section>

      {/* 
        2. Breadcrumb & Progress Section 
        Mimics: container px-4 mt-6 -> breadcrumb & progress bar
      */}
      <div className="container mx-auto px-4 -mt-8 relative z-20 mb-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-6 border border-slate-100"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <nav className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <Link href="/" className="flex items-center gap-1.5 hover:text-blue-600 transition-colors">
                <HomeIcon className="w-4 h-4" />
                الرئيسية
              </Link>
              <ChevronLeft className="w-4 h-4 text-slate-300" />
              <span className="text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                {country.name}
              </span>
            </nav>
            <div className="text-xs font-semibold text-slate-400">
              مستوى التقدم: 25%
            </div>
          </div>
          
          <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: "25%" }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full" 
            />
          </div>
        </motion.div>
      </div>

      {/* 
        3. Main Content Grid (Classes vs Sidebar) 
        Blade structure: col-md-7 (classes) | col-md-5 (calendar + search)
      */}
      <div className="container mx-auto px-4 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: Classes Grid (lg:col-span-7) */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <School className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">الصفوف الدراسية</h2>
                  <p className="text-slate-500 text-sm">اختر صفك للوصول إلى المحتوى</p>
                </div>
              </div>

              {classes.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {classes.map((schoolClass, index) => {
                    const style = classAccents[index % classAccents.length];
                    return (
                      <Link
                        key={schoolClass.id}
                        href={`/${country.code}/lesson/${schoolClass.id}`}
                        className={`
                          group relative flex items-center justify-between p-5 rounded-2xl border-1 transition-all duration-300
                          ${style}
                        `}
                      >
                        <span className="font-bold text-lg group-hover:scale-105 transition-transform">
                          {schoolClass.grade_name}
                        </span>
                        <div className="w-8 h-8 rounded-full bg-white/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <ArrowLeft className="w-4 h-4" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16 border-2 border-dashed border-slate-100 rounded-2xl">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4">
                    <School className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="text-slate-500 font-medium">لا توجد صفوف متاحة حالياً</p>
                </div>
              )}

              {/* Dynamic Ad Area - Client Side Only */}
              {isMounted && (adSettings?.googleAdsDesktop || adSettings?.googleAdsMobile) && (
                <div className="mt-8 relative overflow-hidden rounded-2xl">
                  {/* Desktop Ad */}
                  {adSettings.googleAdsDesktop && (
                    <div
                      className="hidden md:block"
                      dangerouslySetInnerHTML={{ __html: adSettings.googleAdsDesktop }}
                    />
                  )}
                  {/* Mobile Ad */}
                  {adSettings.googleAdsMobile && (
                    <div
                      className="block md:hidden"
                      dangerouslySetInnerHTML={{ __html: adSettings.googleAdsMobile }}
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Calendar & Search (lg:col-span-5) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Calendar Card */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white border border-slate-100 rounded-lg shadow-sm text-blue-600">
                    <CalendarIcon className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-slate-800 text-lg">
                    {format(calendarDate, 'MMMM yyyy', { locale: arSA })}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => setCalendarDate(subMonths(calendarDate, 1))} 
                    className="w-9 h-9 flex items-center justify-center hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-600 border border-transparent hover:border-slate-100"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setCalendarDate(addMonths(calendarDate, 1))} 
                    className="w-9 h-9 flex items-center justify-center hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-600 border border-transparent hover:border-slate-100"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-7 mb-4">
                  {daysAr.map(day => (
                    <div key={day} className="text-center text-xs font-bold text-slate-400 py-2">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {calendarDays.map((day) => {
                    const dKey = format(day, 'yyyy-MM-dd');
                    const isCurrMonth = isSameMonth(day, calendarDate);
                    const isSel = selectedDate === dKey;
                    const hasEv = (eventsByDate.get(dKey) || []).length > 0;
                    const isT = isToday(day);

                    return (
                      <button
                        key={dKey}
                        onClick={() => {
                          setSelectedDate(dKey);
                          if (hasEv) {
                            setEventModalDate(dKey);
                            setIsEventModalOpen(true);
                          }
                        }}
                        className={`
                          aspect-square rounded-xl flex flex-col items-center justify-center text-sm relative transition-all duration-200
                          ${!isCurrMonth ? 'text-slate-300 opacity-50' : 'text-slate-700 hover:bg-slate-50'}
                          ${isSel ? 'ring-2 ring-blue-500 ring-offset-2 z-10' : ''}
                          ${isT ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md hover:shadow-lg scale-105' : ''}
                          ${hasEv && !isT ? 'bg-blue-50 font-bold text-blue-600 border border-blue-100' : ''}
                        `}
                      >
                        <span className="relative z-10">{format(day, 'd')}</span>
                        {hasEv && (
                          <span className={`w-1.5 h-1.5 rounded-full mt-1 ${isT ? 'bg-white' : 'bg-blue-500'}`} />
                        )}
                      </button>
                    );
                  })}
                </div>
                
                <div className="mt-6 pt-4 border-t border-slate-100">
                   <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                     <Clock3 className="w-4 h-4 text-blue-500" />
                     أحداث قادمة
                   </h4>
                   {upcomingEvents.length > 0 ? (
                     <div className="space-y-2">
                       {upcomingEvents.map(e => (
                         <div key={e.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <div className="w-10 h-10 rounded-lg bg-white flex flex-col items-center justify-center text-xs border border-slate-100 shadow-sm">
                               <span className="font-bold text-slate-700">{format(e.date, 'd')}</span>
                               <span className="text-slate-400 text-[10px]">{format(e.date, 'MMM', { locale: arSA })}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                               <div className="font-semibold text-slate-900 text-sm truncate">{e.title}</div>
                               <div className="text-slate-500 text-xs truncate">{e.description || 'لا يوجد وصف'}</div>
                            </div>
                         </div>
                       ))}
                     </div>
                   ) : (
                     <p className="text-xs text-slate-500 text-center py-2">لا توجد أحداث قادمة قريباً</p>
                   )}
                </div>
              </div>
            </div>

            {/* Search Widget */}
            <div className="bg-card rounded-3xl shadow-sm border border-border p-6 relative overflow-hidden text-foreground">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-bl-full -mr-4 -mt-4 opacity-50" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-muted rounded-lg text-muted-foreground">
                       <Search className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-foreground text-lg">بحث سريع</h3>
                  </div>
                </div>
                
                <QuickSearch showTitle={false} className="shadow-none border-0 p-0 bg-transparent" />
                
                <div className="mt-6 pt-4 border-t border-border flex justify-center">
                  <Link 
                    href="/search" 
                    className="group inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-primary/90 transition-colors bg-primary/10 px-4 py-2 rounded-full hover:bg-primary/20"
                  >
                     <span>بحث متقدم</span>
                     <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Second Ad Position - Full Width Banner between sections - Client Side Only */}
      {isMounted && (adSettings?.googleAdsDesktop2 || adSettings?.googleAdsMobile2) && (
        <div className="container mx-auto px-4 py-8">
          <div className="relative overflow-hidden rounded-2xl">
            {/* Desktop Ad */}
            {adSettings.googleAdsDesktop2 && (
              <div
                className="hidden md:block"
                dangerouslySetInnerHTML={{ __html: adSettings.googleAdsDesktop2 }}
              />
            )}
            {/* Mobile Ad */}
            {adSettings.googleAdsMobile2 && (
              <div
                className="block md:hidden"
                dangerouslySetInnerHTML={{ __html: adSettings.googleAdsMobile2 }}
              />
            )}
          </div>
        </div>
      )}

      {/*
        4. Categories Section
      */}
      {categories && categories.length > 0 && (
        <section className="py-24 bg-white relative overflow-hidden">
          {/* Decorative Background */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] opacity-[0.4] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <motion.h2 
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-3xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight"
              >
                الأقسام <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">التعليمية</span>
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="text-slate-500 text-lg"
              >
                اختر القسم المناسب لاستكشاف جميع المواد الدراسية والملفات المرتبطة به
              </motion.p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {parentCategories.map((category, index) => {
                 const children = childrenByParent.get(category.id) || [];
                 const gradients = [
                   'from-blue-600 to-cyan-500',
                   'from-purple-600 to-pink-500',
                   'from-emerald-600 to-teal-500',
                   'from-amber-500 to-orange-600',
                   'from-rose-600 to-red-500',
                 ];
                 const gradient = gradients[index % gradients.length];

                   return (
                   <motion.div 
                     key={category.id}
                     initial={{ opacity: 0, y: 20 }}
                     whileInView={{ opacity: 1, y: 0 }}
                     viewport={{ once: true }}
                     transition={{ delay: index * 0.05 }}
                     className="group h-full"
                   >
                     <div 
                       className="block h-full relative bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-blue-900/10 transition-all duration-500 overflow-hidden"
                     >
                       <Link 
                         href={`/${country.code}/posts/category/${category.id}`}
                         className="absolute inset-0 z-0"
                         aria-label={category.name}
                       />

                       {/* Card Image / Header */}
                       <div className="h-32 w-full relative overflow-hidden bg-slate-50 pointer-events-none">
                        {category.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img 
                            src={getStorageUrl(category.image_url)} 
                            alt={category.name} 
                            className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" 
                          />
                        ) : (
                           <div className={`w-full h-full bg-gradient-to-br ${gradient} opacity-10 group-hover:opacity-20 transition-opacity`} />
                         )}
                         {/* Gradient Overlay */}
                         <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
                       </div>

                       {/* Icon */}
                       <div className="absolute top-20 right-6 pointer-events-none">
                         <div className="w-16 h-16 rounded-2xl bg-white shadow-lg shadow-slate-200/50 p-3 flex items-center justify-center border border-slate-50 group-hover:scale-110 transition-transform duration-300">
                           {(() => {
                             // 1. Lucide Icon Name (Prioritized)
                             let IconComponent = null;
                             const iconName = category.icon?.trim();
                             
                             if (iconName && !iconName.includes('/')) {
                               // Direct match
                               if ((LucideIcons as any)[iconName]) {
                                 IconComponent = (LucideIcons as any)[iconName];
                               } 
                               // PascalCase fallback (school -> School)
                               else {
                                 const pascalName = iconName.charAt(0).toUpperCase() + iconName.slice(1);
                                 if ((LucideIcons as any)[pascalName]) {
                                   IconComponent = (LucideIcons as any)[pascalName];
                                 }
                                 // Kebab-case to PascalCase fallback (book-open -> BookOpen)
                                 else if (iconName.includes('-')) {
                                   const camelName = iconName.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
                                   if ((LucideIcons as any)[camelName]) {
                                     IconComponent = (LucideIcons as any)[camelName];
                                   }
                                 }
                               }
                             }

                             if (IconComponent) {
                               return (
                                 <div className={`w-full h-full rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white`}>
                                   <IconComponent className="w-8 h-8" />
                                 </div>
                               );
                             }

                             // 2. Uploaded Icon Image
                            if (category.icon_image_url) {
                              return (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img 
                                  src={getStorageUrl(category.icon_image_url)} 
                                  alt="" 
                                  className="w-full h-full object-contain" 
                                />
                              );
                            }

                             // 3. Generic Icon URL or Path (e.g. from old uploads)
                            if (category.icon_url || (category.icon && category.icon.includes('/'))) {
                              return (
                                <div className="relative w-full h-full">
                                  <Image 
                                    src={getStorageUrl(category.icon_url || category.icon) || ''} 
                                    alt="" 
                                    fill
                                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                                    className="object-contain" 
                                  />
                                </div>
                              );
                            }
                             
                             // 4. Default Fallback
                             return (
                               <div className={`w-full h-full rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white`}>
                                 <BookOpen className="w-7 h-7" />
                               </div>
                             );
                           })()}
                         </div>
                       </div>

                       {/* Content */}
                       <div className="pt-8 px-6 pb-6 pointer-events-none">
                         <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                          {category.name}
                        </h3>
                        
                        {/* Subcategories */}
                         <div className="border-t border-slate-100 pt-4">
                           <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-3">
                             <span>الفروع المتاحة</span>
                             <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                               {children.length}
                             </span>
                           </div>
                           <div className="flex flex-wrap gap-2 pointer-events-auto relative z-10">
                             {children.slice(0, 3).map(child => (
                               <Link
                                 key={child.id}
                                 href={`/${country.code}/posts/category/${child.id}`}
                                 className="px-2 py-1 rounded-lg bg-slate-50 border border-slate-100 text-slate-600 text-xs hover:bg-blue-50 hover:text-blue-600 hover:border-blue-100 transition-colors"
                               >
                                 {child.name}
                               </Link>
                             ))}
                             {children.length > 3 && (
                               <span className="px-2 py-1 rounded-lg bg-slate-50 border border-slate-100 text-slate-400 text-xs">
                                 +{children.length - 3}
                               </span>
                             )}
                           </div>
                         </div>
                       </div>
                     </div>
                   </motion.div>
                 );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Events Modal */}
      <Modal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        title={`أحداث ${format(parseISO(eventModalDate), 'EEEE d MMMM yyyy', { locale: arSA })}`}
        description={country.name}
        size="md"
      >
        {eventModalEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
             <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
               <CalendarIcon className="w-8 h-8 text-slate-300" />
             </div>
             <p className="text-slate-500">لا توجد أحداث مجدولة لهذا اليوم</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-auto custom-scrollbar p-1">
            {eventModalEvents.map((e) => (
              <div key={e.id} className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 hover:border-blue-300 hover:shadow-md transition-all">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
                <div className="pl-3">
                   <div className="font-bold text-slate-900 mb-1 text-lg">{e.title}</div>
                   {e.description ? (
                     <div className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{e.description}</div>
                   ) : (
                     <div className="text-xs text-slate-400 italic">لا يوجد تفاصيل إضافية</div>
                   )}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-6 flex justify-end pt-4 border-t border-slate-100">
          <Button variant="outline" onClick={() => setIsEventModalOpen(false)}>
            إغلاق النافذة
          </Button>
        </div>
      </Modal>

      {/* Global Styles for Scrollbar */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}
