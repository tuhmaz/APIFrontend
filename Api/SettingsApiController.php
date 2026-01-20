<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Setting;
use App\Support\AdSnippetSanitizer;
use App\Services\SmtpTestService;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Log;
use App\Http\Resources\BaseResource;

class SettingsApiController extends Controller
{
    /**
     * إرجاع كل الإعدادات (لـ Vue/React)
     */
    public function getAll()
    {
        $settings = Setting::all()
            ->pluck('value', 'key');

        return new BaseResource(['data' => $settings]);
    }

    /**
     * تحديث الإعدادات
     */
    public function update(Request $request)
    {
        try {
            $data = $request->all();
            $envUpdates = [];

            // معالجة ملفات الصور (logo, favicon)
            foreach ($data as $key => $value) {
                if ($request->hasFile($key)) {
                    $file = $request->file($key);

                    if (!in_array($file->getMimeType(), ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'])) {
                        return (new BaseResource(['message' => 'الملف يجب أن يكون صورة']))
                            ->response($request)
                            ->setStatusCode(422);
                    }

                    $path = $file->store('settings', 'public');
                    $data[$key] = $path;
                }
            }

            // Sanitizing AdSense code
            $adsenseClient = $data['adsense_client'] ?? Setting::get('adsense_client');

            foreach ($data as $key => $value) {
                if (str_starts_with($key, 'google_ads_')) {
                    if (!empty(trim($value))) {
                        $data[$key] = AdSnippetSanitizer::sanitize($value, $adsenseClient, $key);
                    } else {
                        $data[$key] = "";
                    }
                }
            }

            // حفظ الإعدادات في قاعدة البيانات
            foreach ($data as $key => $value) {
                Setting::updateOrCreate(
                    ['key' => $key],
                    ['value' => $value]
                );
            }

            // التحديث الفوري للغة
            if (isset($data['site_language'])) {
                session(['locale' => $data['site_language']]);
                app()->setLocale($data['site_language']);
            }

            return new BaseResource(['message' => 'تم تحديث الإعدادات بنجاح']);

        } catch (ValidationException $e) {
            return (new BaseResource([
                'message' => 'فشل في التحقق من صحة البيانات',
                'errors' => $e->errors()
            ]))
                ->response($request)
                ->setStatusCode(422);

        } catch (\Exception $e) {
            Log::error('Settings API Error: '.$e->getMessage());

            return (new BaseResource([
                'message' => 'حدث خطأ في تحديث الإعدادات',
                'error' => $e->getMessage()
            ]))
                ->response($request)
                ->setStatusCode(500);
        }
    }

    /**
     * اختبار اتصال SMTP
     */
    public function testSmtp(Request $request, SmtpTestService $smtp)
    {
        $result = $smtp->testConnection();

        return (new BaseResource(['result' => $result]))
            ->response($request)
            ->setStatusCode($result['success'] ? 200 : 500);
    }

    /**
     * إرسال رسالة تجريبية SMTP
     */
    public function sendTestEmail(Request $request, SmtpTestService $smtp)
    {
        $request->validate([
            'email' => 'required|email'
        ]);

        // اختبار الاتصال أولاً
        $conn = $smtp->testConnection();
        if (!$conn['success']) {
            return (new BaseResource(['result' => $conn]))
                ->response($request)
                ->setStatusCode(500);
        }

        try {
            Mail::raw('اختبار إعدادات SMTP', function ($msg) use ($request) {
                $msg->to($request->email)
                    ->subject('SMTP Test');
            });

            return new BaseResource(['message' => 'تم إرسال البريد بنجاح']);

        } catch (\Exception $e) {
            Log::error('SMTP Test Email Error: '.$e->getMessage());

            return (new BaseResource([
                'message' => 'فشل إرسال البريد',
                'error' => $e->getMessage()
            ]))
                ->response($request)
                ->setStatusCode(500);
        }
    }

    /**
     * تحديث robots.txt
     */
    public function updateRobots(Request $request)
    {
        $request->validate([
            'content' => 'required|string'
        ]);

        file_put_contents(public_path('robots.txt'), $request->content);

        return new BaseResource(['message' => 'تم تحديث Robots.txt']);
    }
}
