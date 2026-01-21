# دليل رفع مشروع Next.js على Plesk

## متطلبات السيرفر
- Node.js 18+ (يفضل 20 LTS)
- PM2 لإدارة العمليات
- Nginx كـ reverse proxy

## الخطوات

### 1. تثبيت Node.js على السيرفر

اتصل بالسيرفر عبر SSH:
```bash
ssh root@152.53.208.71
```

تثبيت Node.js 20:
```bash
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs
node -v  # يجب أن يظهر v20.x.x
```

تثبيت PM2:
```bash
npm install -g pm2
pm2 startup  # لتشغيل PM2 تلقائياً عند إعادة تشغيل السيرفر
```

### 2. إعداد مجلد الموقع

```bash
# إنشاء مجلد للموقع
mkdir -p /var/www/vhosts/alemancenter.com/httpdocs
mkdir -p /var/www/vhosts/alemancenter.com/logs
cd /var/www/vhosts/alemancenter.com/httpdocs
```

### 3. رفع الملفات

**الملفات المطلوبة للرفع:**
- `.next/` - مجلد البناء
- `node_modules/` - المكتبات (أو تثبيتها على السيرفر)
- `public/` - الملفات الثابتة
- `package.json`
- `package-lock.json`
- `.env.production` (أو `.env`)
- `ecosystem.config.js`
- `next.config.ts`

**طريقة الرفع:**

الطريقة 1 - عبر Git:
```bash
cd /var/www/vhosts/alemancenter.com/httpdocs
git clone YOUR_REPO_URL .
npm install --production
npm run build
```

الطريقة 2 - عبر SFTP/SCP:
```bash
# من جهازك المحلي
scp -r .next public package.json package-lock.json .env.production ecosystem.config.js next.config.ts root@152.53.208.71:/var/www/vhosts/alemancenter.com/httpdocs/

# ثم على السيرفر
cd /var/www/vhosts/alemancenter.com/httpdocs
npm install --production
```

الطريقة 3 - ضغط ورفع:
```bash
# محلياً - ضغط الملفات
tar -czf website.tar.gz .next public package.json package-lock.json .env.production ecosystem.config.js next.config.ts node_modules

# رفع الملف المضغوط
scp website.tar.gz root@152.53.208.71:/var/www/vhosts/alemancenter.com/httpdocs/

# على السيرفر - فك الضغط
cd /var/www/vhosts/alemancenter.com/httpdocs
tar -xzf website.tar.gz
rm website.tar.gz
```

### 4. إنشاء ملف البيئة على السيرفر

```bash
cat > /var/www/vhosts/alemancenter.com/httpdocs/.env << 'EOF'
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.alemancenter.com/api
NEXT_PUBLIC_APP_URL=https://alemancenter.com
NEXT_PUBLIC_FRONTEND_API_KEY=9f3c6a7b1d2e4f8a0c5e9a1b7d6f2c8e4a9b0d3e5f6a1c7b8e2d4f9a6c0b
EOF
```

### 5. تشغيل التطبيق بـ PM2

```bash
cd /var/www/vhosts/alemancenter.com/httpdocs

# تشغيل باستخدام ecosystem.config.js
pm2 start ecosystem.config.js

# أو تشغيل مباشر
pm2 start npm --name "alemancenter-frontend" -- start

# حفظ إعدادات PM2
pm2 save

# التحقق من الحالة
pm2 status
pm2 logs alemancenter-frontend
```

### 6. إعداد Nginx في Plesk

اذهب إلى:
**Plesk > alemancenter.com > Apache & nginx Settings**

أضف في **Additional nginx directives**:

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    proxy_read_timeout 86400;
}

# Cache static assets
location /_next/static {
    proxy_pass http://127.0.0.1:3000;
    proxy_cache_valid 60m;
    add_header Cache-Control "public, max-age=31536000, immutable";
}

# Health check endpoint
location /api/health {
    proxy_pass http://127.0.0.1:3000;
}
```

### 7. إعداد SSL

في Plesk:
1. اذهب إلى **alemancenter.com > SSL/TLS Certificates**
2. اختر **Let's Encrypt**
3. فعّل **Redirect from HTTP to HTTPS**

### 8. أوامر مفيدة

```bash
# إعادة تشغيل التطبيق
pm2 restart alemancenter-frontend

# إيقاف التطبيق
pm2 stop alemancenter-frontend

# عرض السجلات
pm2 logs alemancenter-frontend --lines 100

# مراقبة الأداء
pm2 monit

# تحديث التطبيق
cd /var/www/vhosts/alemancenter.com/httpdocs
git pull  # إذا كنت تستخدم Git
npm install
npm run build
pm2 restart alemancenter-frontend
```

### 9. استكشاف الأخطاء

**التطبيق لا يعمل:**
```bash
# تحقق من حالة PM2
pm2 status

# تحقق من السجلات
pm2 logs alemancenter-frontend --err --lines 50

# تحقق من المنفذ
netstat -tlnp | grep 3000
```

**مشاكل الصلاحيات:**
```bash
# تعيين المالك الصحيح
chown -R nginx:nginx /var/www/vhosts/alemancenter.com/httpdocs
chmod -R 755 /var/www/vhosts/alemancenter.com/httpdocs
```

**إعادة تشغيل Nginx:**
```bash
systemctl restart nginx
```

---

## ملاحظات هامة

1. **API Backend**: تأكد أن `api.alemancenter.com` يعمل ويستجيب
2. **CORS**: تأكد أن Laravel Backend يسمح بـ CORS من `alemancenter.com`
3. **Firewall**: تأكد أن المنفذ 3000 مفتوح داخلياً (لا يحتاج فتح خارجي)
4. **Memory**: Next.js يحتاج على الأقل 512MB RAM
