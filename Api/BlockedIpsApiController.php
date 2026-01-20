<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BannedIp;
use Illuminate\Http\Request;
use App\Http\Resources\BaseResource;

class BlockedIpsApiController extends Controller
{
    /**
     * GET /api/security/blocked-ips
     * جلب قائمة الـ IP المحظورة
     */
    public function index(Request $request)
    {
        $blockedIps = BannedIp::with('blockedBy')
            ->latest('created_at')
            ->paginate(15);

        return new BaseResource([
            'data' => $blockedIps
        ]);
    }

    /**
     * DELETE /api/security/blocked-ips/{id}
     * حذف IP واحد من قائمة الحظر
     */
    public function destroy($id)
    {
        $ip = BannedIp::find($id);

        if (!$ip) {
            return (new BaseResource(['message' => 'IP غير موجود']))
                ->response(request())
                ->setStatusCode(404);
        }

        $ip->delete();

        return new BaseResource([
            'message' => 'تم إزالة IP من قائمة الحظر'
        ]);
    }

    /**
     * DELETE /api/security/blocked-ips/bulk
     * حذف مجموعة من الـ IPs عبر IDs
     */
    public function bulkDestroy(Request $request)
    {
        $request->validate([
            'ids'   => 'required|array',
            'ids.*' => 'exists:banned_ips,id'
        ]);

        BannedIp::whereIn('id', $request->ids)->delete();

        return new BaseResource([
            'message' => 'تم إزالة عناوين IP المحددة من قائمة الحظر'
        ]);
    }
}
