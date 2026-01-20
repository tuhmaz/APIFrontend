<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SecurityLog;
use App\Services\SecurityLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Response;
use Carbon\Carbon;
use App\Http\Resources\BaseResource;
use App\Http\Resources\Api\SecurityLogResource;

class SecurityLogApiController extends Controller
{
    protected array $eventTypes = [
        'login_failed',
        'suspicious_activity',
        'blocked_access',
        'unauthorized_access',
        'password_reset',
        'account_locked',
        'permission_change'
    ];

    protected array $severityLevels = [
        'info',
        'warning',
        'danger',
        'critical'
    ];

    protected SecurityLogService $service;

    public function __construct(SecurityLogService $service)
    {
        $this->middleware('auth:sanctum');
        $this->service = $service;
    }

    /**
     * Quick stats + recent logs
     */
    public function overview()
    {
        $stats = $this->service->getQuickStats();

        $recentLogs = SecurityLog::latest()
            ->with('user')
            ->limit(10)
            ->get()
            ->map(function ($log) {
                $log->event_type_color = $this->eventColor($log->event_type);
                return $log;
            });

        return new BaseResource([
            'stats' => $stats,
            'recent_logs' => SecurityLogResource::collection($recentLogs)
        ]);
    }

    /**
     * Filtered Logs
     */
    public function logs(Request $request)
    {
        $query = SecurityLog::with('user')
            ->when($request->event_type, fn($q) => $q->where('event_type', $request->event_type))
            ->when($request->severity, fn($q) => $q->where('severity', $request->severity))
            ->when($request->ip, fn($q) => $q->where('ip_address', 'like', "%{$request->ip}%"))
            ->when($request->is_resolved, fn($q) =>
                $q->where('is_resolved', $request->is_resolved === 'true')
            )
            ->when($request->date_from, fn($q) =>
                $q->whereDate('created_at', '>=', $request->date_from)
            )
            ->when($request->date_to, fn($q) =>
                $q->whereDate('created_at', '<=', $request->date_to)
            );

        $logs = $query->latest()->paginate($request->per_page ?? 20);

        $logs->getCollection()->transform(function ($log) {
            $log->event_type_color = $this->eventColor($log->event_type);
            return $log;
        });

        return SecurityLogResource::collection($logs)
            ->additional(['success' => true]);
    }

    /**
     * Analytics API
     */
    public function analytics(Request $request)
    {
        $range = $request->range ?? 'week';

        $startDate = match ($range) {
            'today' => now()->startOfDay(),
            'week'  => now()->subDays(7)->startOfDay(),
            'month' => now()->subDays(30)->startOfDay(),
            'custom'=> Carbon::parse($request->start_date)->startOfDay(),
            default => now()->subDays(7)->startOfDay(),
        };

        $endDate = $range === 'custom'
            ? Carbon::parse($request->end_date)->endOfDay()
            : now();

        // Main stats
        $stats = SecurityLog::whereBetween('created_at', [$startDate, $endDate])
            ->selectRaw('
                AVG(risk_score) as avg_risk,
                COUNT(*) as total_events,
                COUNT(CASE WHEN is_resolved = 1 THEN 1 END) as resolved_events,
                AVG(TIMESTAMPDIFF(MINUTE, created_at, resolved_at)) as avg_resolution_time
            ')
            ->first();

        $securityScore = $this->computeScore(
            $stats->avg_risk ?? 0,
            $stats->total_events,
            $stats->resolved_events,
            $stats->avg_resolution_time ?? 0
        );

        // Distribution
        $eventDistribution = SecurityLog::whereBetween('created_at', [$startDate, $endDate])
            ->select('event_type', DB::raw('COUNT(*) as count'))
            ->groupBy('event_type')
            ->orderByDesc('count')
            ->get();

        return new BaseResource([
            'security_score' => $securityScore,
            'event_distribution' => $eventDistribution,
        ]);
    }

    /**
     * Mark log as resolved
     */
    public function resolve(SecurityLog $log, Request $request)
    {
        $request->validate(['notes' => 'required|string']);

        $log->update([
            'is_resolved' => true,
            'resolved_at' => now(),
            'resolved_by' => Auth::id(),
            'resolution_notes' => $request->notes
        ]);

        return new BaseResource(['message' => 'Log resolved successfully']);
    }

    /**
     * Delete one log
     */
    public function destroy($id)
    {
        try {
            $log = SecurityLog::findOrFail($id);
            $backup = $log->replicate();
            $log->delete();
            $ipAddress = $backup->ip_address;
            if (!$ipAddress || !filter_var($ipAddress, FILTER_VALIDATE_IP)) {
                $ipAddress = request()->ip();
            }
            if (!$ipAddress || !filter_var($ipAddress, FILTER_VALIDATE_IP)) {
                $ipAddress = '0.0.0.0';
            }
            SecurityLog::create([
                'ip_address' => $ipAddress,
                'event_type' => 'log_deleted',
                'description' => "Deleted log: {$backup->event_type}",
                'user_id' => Auth::id(),
                'severity' => 'info',
                'is_resolved' => true
            ]);
            return new BaseResource(['message' => 'Log deleted']);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return (new BaseResource(['message' => 'Log not found']))
                ->response(request())
                ->setStatusCode(404);
        }
    }

    /**
     * Delete all logs
     */
    public function destroyAll()
    {
        SecurityLog::truncate();

        return new BaseResource(['message' => 'All logs deleted']);
    }

    public function export(Request $request)
    {
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="security-logs.csv"',
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0'
        ];

        $logs = SecurityLog::with('user')
            ->when($request->event_type, fn($q) => $q->where('event_type', $request->event_type))
            ->when($request->severity, fn($q) => $q->where('severity', $request->severity))
            ->when($request->is_resolved, fn($q) => $q->where('is_resolved', $request->is_resolved === 'true'))
            ->latest()
            ->get();

        $callback = function () use ($logs) {
            $file = fopen('php://output', 'w');
            fputcsv($file, [
                'ID',
                'Time',
                'IP Address',
                'Event Type',
                'Description',
                'User',
                'Route',
                'Severity',
                'Status',
                'Risk Score',
                'Country',
                'City',
                'Attack Type',
                'Occurrences'
            ]);

            foreach ($logs as $log) {
                fputcsv($file, [
                    $log->id,
                    $log->created_at,
                    $log->ip_address,
                    $log->event_type,
                    $log->description,
                    $log->user ? $log->user->name : 'System',
                    $log->route,
                    $log->severity,
                    $log->is_resolved ? 'Resolved' : 'Pending',
                    $log->risk_score,
                    $log->country_code,
                    $log->city,
                    $log->attack_type,
                    $log->occurrence_count
                ]);
            }

            fclose($file);
        };

        return Response::stream($callback, 200, $headers);
    }

    /**
     * Block IP
     */
    public function blockIp(Request $request)
    {
        $request->validate([
            'ip_address' => 'required|ip',
            'reason' => 'required|string'
        ]);

        SecurityLog::create([
            'ip_address' => $request->ip_address,
            'event_type' => 'blocked_access',
            'description' => $request->reason,
            'user_id' => Auth::id(),
            'severity' => 'warning',
            'risk_score' => 75,
            'is_resolved' => false
        ]);

        return new BaseResource(['message' => 'IP blocked successfully']);
    }

    /**
     * Trust IP
     */
    public function trustIp(Request $request)
    {
        $request->validate([
            'ip_address' => 'required|ip',
            'reason' => 'required|string'
        ]);

        SecurityLog::create([
            'ip_address' => $request->ip_address,
            'event_type' => 'trusted_access',
            'description' => $request->reason,
            'user_id' => Auth::id(),
            'severity' => 'info',
            'risk_score' => 0,
            'is_resolved' => true
        ]);

        return new BaseResource(['message' => 'IP trusted successfully']);
    }

    /**
     * Unblock IP
     */
    public function unblockIp(Request $request)
    {
        $request->validate(['ip_address' => 'required|ip']);

        SecurityLog::where('ip_address', $request->ip_address)
            ->where('event_type', 'blocked_access')
            ->update([
                'is_resolved' => true,
                'resolved_at' => now(),
                'resolved_by' => Auth::id(),
                'resolution_notes' => 'Manually unblocked'
            ]);

        return new BaseResource(['message' => 'IP unblocked successfully']);
    }

    /**
     * Remove trusted status
     */
    public function untrustIp(Request $request)
    {
        $request->validate(['ip_address' => 'required|ip']);

        SecurityLog::where('ip_address', $request->ip_address)
            ->where('event_type', 'trusted_access')
            ->update([
                'is_resolved' => false,
                'resolved_at' => null,
                'resolved_by' => null
            ]);

        return new BaseResource(['message' => 'IP removed from trusted list']);
    }

    /**
     * IP Details
     */
    public function ipDetails($ip)
    {
        $logs = SecurityLog::where('ip_address', $ip)
            ->with('user')
            ->orderByDesc('created_at')
            ->get();

        $stats = [
            'first_seen' => $logs->last()->created_at ?? null,
            'last_seen' => $logs->first()->created_at ?? null,
            'total_events' => $logs->count(),
            'event_types' => $logs->groupBy('event_type')->map(fn($g) => $g->count()),
            'risk' => [
                'current' => $logs->first()->risk_score ?? 0,
                'avg' => $logs->avg('risk_score'),
                'max' => $logs->max('risk_score')
            ]
        ];

        return new BaseResource([
            'logs' => SecurityLogResource::collection($logs),
            'stats' => $stats
        ]);
    }

    /**
     * Helpers
     */
    protected function computeScore($avgRisk, $total, $resolved, $avgTime)
    {
        if ($total === 0) return 100;

        $riskScore = max(0, 100 - ($avgRisk * 10));
        $resolutionRate = ($resolved / $total) * 100;
        $responseScore = max(0, 100 - (($avgTime / 120) * 100));

        return round(
            $riskScore * 0.3 +
            $resolutionRate * 0.4 +
            $responseScore * 0.3
        );
    }

    protected function eventColor($type)
    {
        return match ($type) {
            'login_failed', 'blocked_access', 'unauthorized_access' => 'danger',
            'suspicious_activity', 'account_locked' => 'warning',
            'password_reset', 'permission_change' => 'info',
            default => 'secondary'
        };
    }
}
