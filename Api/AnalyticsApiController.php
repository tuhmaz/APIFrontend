<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\VisitorTracking;
use App\Services\VisitorService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use App\Http\Resources\BaseResource;

class AnalyticsApiController extends Controller
{
    protected $visitorService;

    public function __construct(VisitorService $visitorService)
    {
        $this->visitorService = $visitorService;
    }

    /**
     * GET /api/analytics
     * نقطة الدخول الرئيسية للتحليلات
     */
    public function index()
    {
        return new BaseResource([
            'visitor_stats'  => $this->getVisitorStats(),
            'user_stats'     => $this->getUserStats(),
            'country_stats'  => $this->getCountryStats(),
        ]);
    }

    /**
     * إحصائيات الزوار (مع دمج منطق الخدمة)
     */
    public function getVisitorStats()
    {
        // إحصائيات الزوار (من الخدمة الأصلية)
        $stats = $this->visitorService->getVisitorStats();

        // الزوار النشطين الآن بالتفصيل
        $activeVisitors = $this->getActiveVisitorsDetailed();

        // عدد الأعضاء النشطين الآن
        $currentMembers = Cache::remember('current_members', 300, function () {
            return User::where('last_activity', '>=', now()->subMinutes(5))->count();
        });

        // عدد الضيوف (الزوار غير المسجلين)
        $currentGuests = max(0, $stats['current'] - $currentMembers);

        // عدد الأعضاء الذين قاموا بأي نشاط اليوم
        $totalMembersToday = Cache::remember('total_members_today', 3600, function () {
            return User::where('last_activity', '>=', today())->count();
        });

        // إجمالي الزوار اليوم (زوار + أعضاء)
        $totalCombinedToday = $stats['total_today'] + $totalMembersToday;

        return [
            'current'               => $stats['current'],
            'current_members'       => $currentMembers,
            'current_guests'        => $currentGuests,
            'total_today'           => $stats['total_today'],
            'total_combined_today'  => $totalCombinedToday,
            'change'                => $stats['change'],
            'history'               => $stats['history'],
            'active_visitors'       => $activeVisitors,
        ];
    }

    /**
     * إرجاع بيانات الزوار النشطين بالتفصيل
     */
    private function getActiveVisitorsDetailed()
    {
        $records = DB::table('visitors_tracking')
            ->where('last_activity', '>=', now()->subMinutes(5))
            ->orderBy('last_activity', 'desc')
            ->limit(20)
            ->get();

        $active = [];

        foreach ($records as $v) {
            $user = $v->user_id ? User::find($v->user_id) : null;

            $page = $v->url ?? '/';
            $pageDisplay = $this->formatPageUrl($page);

            $active[] = [
                'ip'                => $v->ip_address,
                'country'           => $v->country ?? 'غير محدد',
                'city'              => $v->city ?? 'غير محدد',
                'browser'           => $v->browser ?? 'غير محدد',
                'os'                => $v->os ?? 'غير محدد',
                'current_page'      => $pageDisplay,
                'current_page_full' => $page,
                'is_member'         => $user ? true : false,
                'user_name'         => $user?->name,
                'last_active'       => Carbon::parse($v->last_activity),
            ];
        }

        return $active;
    }

    /**
     * تحسين صياغة الرابط للعرض
     */
    private function formatPageUrl($url)
    {
        if (!$url || $url === '/') {
            return 'الصفحة الرئيسية';
        }

        $path = parse_url($url, PHP_URL_PATH) ?: '/';
        $query = parse_url($url, PHP_URL_QUERY);

        $pageNames = [
            '/'                                => 'الصفحة الرئيسية',
            '/dashboard'                        => 'لوحة التحكم',
            '/dashboard/analytics/visitors'     => 'تحليلات الزوار',
            '/login'                            => 'تسجيل الدخول',
            '/register'                         => 'التسجيل',
            '/news'                             => 'الأخبار',
            '/articles'                         => 'المقالات',
            '/contact'                          => 'اتصل بنا',
            '/about'                            => 'من نحن',
        ];

        if (isset($pageNames[$path])) {
            return $pageNames[$path];
        }

        // صفحات تحتوي معرف
        if (preg_match('/\/(\w+)\/(\d+)/', $path, $matches)) {
            $section = $matches[1];
            $id = $matches[2];

            $names = [
                'news'       => 'خبر رقم',
                'articles'   => 'مقال رقم',
                'users'      => 'مستخدم رقم',
                'categories' => 'قسم رقم',
            ];

            if (isset($names[$section])) {
                return $names[$section] . ' ' . $id;
            }
        }

        return $query ? "$path?$query" : $path;
    }

    /**
     * إحصائيات المستخدمين
     */
    public function getUserStats()
    {
        $total = Cache::remember('total_users', 3600, fn() => User::count());

        $active = Cache::remember('active_users', 300, fn() =>
            User::where('last_activity', '>=', now()->subMinutes(5))->count()
        );

        $newToday = Cache::remember('new_users_today', 3600, fn() =>
            User::whereDate('created_at', today())->count()
        );

        return [
            'total'     => $total,
            'active'    => $active,
            'new_today' => $newToday,
        ];
    }

    /**
     * إحصائيات الدول (آخر 7 أيام)
     */
    public function getCountryStats()
    {
        return Cache::remember('country_stats', 3600, function () {
            return DB::table('visitors_tracking')
                ->select('country', DB::raw('COUNT(*) as count'))
                ->where('created_at', '>=', now()->subDays(7))
                ->whereNotNull('country')
                ->where('country', '!=', 'Unknown')
                ->groupBy('country')
                ->orderBy('count', 'desc')
                ->limit(10)
                ->get()
                ->map(fn($item) => [
                    'country' => $item->country,
                    'count'   => $item->count,
                ])
                ->toArray();
        });
    }

    /**
     * GET /api/analytics/visitors
     */
    public function visitors()
    {
        return new BaseResource([
            'visitor_stats' => $this->getVisitorStats(),
            'user_stats'    => $this->getUserStats(),
            'country_stats' => $this->getCountryStats(),
        ]);
    }
}
