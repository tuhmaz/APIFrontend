<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Notifications\CustomVerifyEmail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Password;
use Illuminate\Auth\Events\Registered;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\RateLimiter;
use Laravel\Socialite\Facades\Socialite;
use Illuminate\Support\Facades\Log;
use App\Http\Resources\BaseResource;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Http\Resources\Api\UserResource;

class AuthApiController extends Controller
{
    private function issueToken(User $user): string
    {
        return $user->createToken('api_token')->plainTextToken;
    }
    /**
     * ============================
     *  REGISTER
     * ============================
     */
    public function register(RegisterRequest $request)
    {
        // validation handled by RegisterRequest

        $user = User::create([
            'name'     => $request->name,
            'email'    => $request->email,
            'password' => Hash::make($request->password),
        ]);

        $user->assignRole('User');
        event(new Registered($user));

        try {
            $user->notify(new CustomVerifyEmail());
        } catch (\Exception $e) {
            Log::error("Failed sending verify email: {$e->getMessage()}");
        }

        $token = $this->issueToken($user);

        return (new BaseResource([
            'status'  => true,
            'message' => 'تم إنشاء الحساب بنجاح. يرجى التحقق من بريدك الإلكتروني.',
            'token'   => $token,
            'user'    => new UserResource($user),
        ]))->response($request)->setStatusCode(201);
    }

    /**
     * ============================
     *  LOGIN
     * ============================
     */
    public function login(LoginRequest $request)
    {
        // validation handled by LoginRequest

        if (!Auth::attempt($request->only('email', 'password'))) {
            throw ValidationException::withMessages([
                'email' => ['بيانات الاعتماد غير صحيحة.'],
            ]);
        }

        $user = Auth::user();

        $token = $this->issueToken($user);

        return new BaseResource([
            'status'  => true,
            'message' => 'تم تسجيل الدخول بنجاح.',
            'token'   => $token,
            'user'    => new UserResource($user)
        ]);
    }

    /**
     * ============================
     *  LOGOUT
     * ============================
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return new BaseResource([
            'status'  => true,
            'message' => 'تم تسجيل الخروج بنجاح.'
        ]);
    }

    /**
     * ============================
     *  GET AUTHENTICATED USER
     * ============================
     */
    public function me(Request $request)
    {
        return new BaseResource([
            'status' => true,
            'user'   => new UserResource($request->user())
        ]);
    }

    /**
     * ============================
     *  FORGOT PASSWORD
     * ============================
     */
    public function forgotPassword(ForgotPasswordRequest $request)
    {
        // validation handled by ForgotPasswordRequest

        $status = Password::sendResetLink($request->only('email'));

        if ($status === Password::RESET_LINK_SENT) {
            return new BaseResource([
                'status'  => true,
                'message' => __($status)
            ]);
        }

        return (new BaseResource(['message' => __($status)]))
            ->response($request)
            ->setStatusCode(400);
    }

    /**
     * ============================
     *  RESET PASSWORD
     * ============================
     */
    public function resetPassword(ResetPasswordRequest $request)
    {
        // validation handled by ResetPasswordRequest
    
        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user) use ($request) {
                $user->forceFill([
                    'password' => Hash::make($request->password)
                ])->setRememberToken(Str::random(60));
                $user->save();

                event(new PasswordReset($user));
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return new BaseResource([
                'status'  => true,
                'message' => __($status)
            ]);
        }

        return (new BaseResource(['message' => __($status)]))
            ->response($request)
            ->setStatusCode(400);
    }

    /**
     * ============================
     *  EMAIL VERIFICATION
     * ============================
     */
    public function verifyEmail(Request $request, $id, $hash)
    {
        $user = User::findOrFail($id);

        if (!hash_equals($hash, sha1($user->email))) {
            throw new AuthorizationException();
        }

        if ($user->hasVerifiedEmail()) {
            return new BaseResource([
                'status'  => true,
                'message' => 'البريد الإلكتروني مؤكد بالفعل.'
            ]);
        }

        $user->markEmailAsVerified();

        return new BaseResource([
            'status'  => true,
            'message' => 'تم تأكيد البريد الإلكتروني بنجاح.'
        ]);
    }

    /**
     * ============================
     *  RESEND VERIFICATION EMAIL
     * ============================
     */
    public function resendVerifyEmail(Request $request)
    {
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return (new BaseResource(['message' => 'البريد الإلكتروني مؤكد بالفعل.']))
                ->response($request)
                ->setStatusCode(400);
        }

        $key = 'verify-email-' . $user->id;

        if (RateLimiter::tooManyAttempts($key, 3)) {
            return (new BaseResource(['message' => "الرجاء الانتظار " . RateLimiter::availableIn($key) . " ثانية."]))
                ->response($request)
                ->setStatusCode(429);
        }

        RateLimiter::hit($key, 60);

        $user->notify(new CustomVerifyEmail());

        return new BaseResource([
            'status'  => true,
            'message' => 'تم إرسال رابط التحقق.'
        ]);
    }

    /**
     * ============================
     *  GOOGLE LOGIN
     * ============================
     */
    public function googleRedirect()
    {
        return Socialite::driver('google')->redirect();
    }

    public function googleCallback()
    {
        try {
            $googleUser = Socialite::driver('google')->user();

            $user = User::where('email', $googleUser->email)->first();

            if (!$user) {
                $user = User::create([
                    'name'              => $googleUser->name,
                    'email'             => $googleUser->email,
                    'password'          => Hash::make(Str::random(24)),
                    'google_id'         => $googleUser->id,
                    'email_verified_at' => now(),
                ]);

                $user->assignRole('User');
            }

            $token = $this->issueToken($user);

            return new BaseResource([
                'status' => true,
                'token'  => $token,
                'user'   => new UserResource($user)
            ]);

        } catch (\Exception $e) {
            Log::error("Google Login Failed: {$e->getMessage()}");

            return (new BaseResource(['message' => 'فشل تسجيل الدخول باستخدام Google.']))
                ->response(request())
                ->setStatusCode(500);
        }
    }
}
