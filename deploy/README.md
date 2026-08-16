# سرزمین عسل — Production Deployment Package

بستهٔ کامل نصب فروشگاه «سرزمین عسل» (سایت + ربات تلگرام) روی سرور شخصی.

---

## پیش‌نیازها

- سرور لینوکس (Debian 11+ یا Ubuntu 20.04+)
- دسترسی root (یا sudo)
- حداقل ۱ گیگابایت رم
- اتصال اینترنت
- (اختیاری) دامنهٔ شخصی برای HTTPS

---

## نحوهٔ نصب

### ۱. انتقال بسته به سرور

تمام فایل‌های این پوشه را به سرور خود منتقل کنید:

```bash
# با scp
scp -r deploy/ user@your-server:/tmp/

# یا با rsync
rsync -avz deploy/ user@your-server:/tmp/sarzemine-deploy/
```

### ۲. اجرای نصب‌کننده

```bash
cd /tmp/sarzemine-deploy
sudo bash setup.sh
```

نصب‌کننده از شما می‌پرسد:
- **توکن ربات تلگرام** (پیش‌فرض: توکن فعلی شما)
- **آیدی عددی ادمین تلگرام** (پیش‌فرض: ۵۲۰۷۶۵۳۱۰۴)
- **دامنه (اختیاری)** — اگر دامنه دارید وارد کنید تا SSL خودکار گرفته شود
- **ایمیل برای Let's Encrypt** (فقط اگر دامنه وارد کنید)

### ۳. پس از نصب

سایت در آدرس `https://your-domain.com` (یا `http://localhost:3000` اگر دامنه ندارید) در دسترس است.

ربات تلگرام به‌طور خودکار شروع به کار می‌کند.

---

## ساختار بسته

```
deploy/
├── setup.sh                    # نصب‌کننده اصلی (اجرای خودکار)
├── monitor.sh                  # اسکریپت مانیتورینگ سلامت
├── README.md                   # این فایل
├── project/                    # سورس کامل پروژه
│   ├── src/                    # کد سایت (Next.js)
│   ├── mini-services/
│   │   └── telegram-bot/       # ربات تلگرام
│   ├── prisma/                 # اسکیمای دیتابیس + seed
│   ├── public/                 # تصاویر و فایل‌های استاتیک
│   ├── package.json
│   ├── next.config.ts
│   └── .env.example
├── systemd/                    # فایل‌های سرویس systemd
│   ├── sarzemine-asal-site.service
│   ├── sarzemine-asal-bot.service
│   ├── sarzemine-asal-monitor.service
│   └── sarzemine-asal-monitor.timer
└── caddy/
    └── Caddyfile.template      # قالب کانفیگ Caddy
```

---

## امکانات نصب‌کننده

✅ نصب خودکار Bun (runtime جاوااسکریپت)  
✅ نصب خودکار Caddy (وب‌سرور با HTTPS خودکار)  
✅ ساخت یوزر اختصاصی `sarzemine` برای امنیت  
✅ کپی پروژه به `/opt/sarzemine-asal`  
✅ نصب وابستگی‌ها + build سایت  
✅ راه‌اندازی دیتابیس + seed محصولات  
✅ کانفیگ Caddy با SSL رایگان Let's Encrypt (اگر دامنه دارید)  
✅ سرویس‌های systemd (شروع خودکار هنگام بوت)  
✅ مانیتورینگ سلامت هر ۵ دقیقه + هشدار تلگرام  
✅ ری‌استارت خودکار در صورت کرش  

---

## مدیریت پس از نصب

### وضعیت سرویس‌ها
```bash
sudo systemctl status sarzemine-asal-site
sudo systemctl status sarzemine-asal-bot
```

### ری‌استارت سرویس‌ها
```bash
sudo systemctl restart sarzemine-asal-site
sudo systemctl restart sarzemine-asal-bot
```

### مشاهدهٔ لاگ‌ها
```bash
# لاگ سایت
sudo journalctl -u sarzemine-asal-site -f

# لاگ ربات
sudo journalctl -u sarzemine-asal-bot -f

# لاگ مانیتورینگ
tail -f /var/log/sarzemine-asal/monitor.log
```

### تغییر تنظیمات (مثلاً توکن ربات)
1. فایل `/opt/sarzemine-asal/.env` را ویرایش کنید:
   ```bash
   sudo nano /opt/sarzemine-asal/.env
   ```
2. ربات را ری‌استارت کنید:
   ```bash
   sudo systemctl restart sarzemine-asal-bot
   ```

---

## مانیتورینگ

اسکریپت مانیتورینگ هر ۵ دقیقه چک می‌کند:
- ✅ سایت (HTTP 200)
- ✅ ربات (health endpoint + polling فعال)
- ✅ سرویس‌های systemd
- ✅ فضای دیسک
- ✅ حافظه

اگر مشکلی پیدا شود، **به‌طور خودکار به ادمین در تلگرام هشدار می‌دهد** (با ۱۵ دقیقه cooldown تا اسپم نشود).

اجدادی‌دن مانیتورینگ:
```bash
sudo /opt/sarzemine-asal/monitor.sh
```

---

## پشتیبان‌گیری از دیتابیس

```bash
# بکاپ
sudo cp /opt/sarzemine-asal/db/custom.db /backup/custom-$(date +%Y%m%d).db

# بازگردانی
sudo systemctl stop sarzemine-asal-site sarzemine-asal-bot
sudo cp /backup/custom-20250101.db /opt/sarzemine-asal/db/custom.db
sudo chown sarzemine:sarzemine /opt/sarzemine-asal/db/custom.db
sudo systemctl start sarzemine-asal-site sarzemine-asal-bot
```

---

## عیب‌یابی

### سایت بالا نمی‌آید
```bash
sudo journalctl -u sarzemine-asal-site -e --no-pager
```

### ربات کار نمی‌کند
```bash
sudo journalctl -u sarzemine-asal-bot -e --no-pager
curl http://localhost:3003/health
```

### SSL کار نمی‌کند
```bash
sudo journalctl -u caddy -e --no-pager
sudo systemctl restart caddy
```

### دیتابیس قفل شده
```bash
sudo systemctl restart sarzemine-asal-site sarzemine-asal-bot
```

---

## نصب مجدد (آپدیت)

برای آپدیت پروژه با نسخهٔ جدید، کافیست بستهٔ جدید را جایگزین کنید و دوباره `setup.sh` را اجرا کنید. تمام داده‌ها (محصولات، سفارشات) حفظ می‌شوند.

```bash
sudo bash setup.sh
```
