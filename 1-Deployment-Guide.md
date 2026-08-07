# 1 - Deployment Guide
**Employee Training Web - React Vite Frontend + Laravel Backend**

| | |
|---|---|
| **Versi Dokumen** | 1.0 |
| **Status** | Draft - Living Document |
| **Terakhir Diperbarui** | 29 Juli 2026 |
| **Target Lokal** | Windows + PowerShell |
| **Frontend** | React 19 + Vite 8, deploy ke Vercel |
| **Backend** | Laravel 13 + PHP 8.3, deploy ke VPS Ubuntu + Nginx + PHP-FPM |
| **Database** | MySQL / MariaDB |

> Dokumen ini mengadaptasi panduan deployment VPS + Vercel agar sesuai dengan project ini. Project ini bukan Node/Express backend; backend memakai Laravel, Composer, PHP-FPM, MySQL, Sanctum, queue database, dan storage Laravel.

---

## Daftar Isi

1. [Ringkasan Arsitektur Deployment](#1-ringkasan-arsitektur-deployment)
2. [Prasyarat Lokal Windows](#2-prasyarat-lokal-windows)
3. [Validasi Sebelum Deploy](#3-validasi-sebelum-deploy)
4. [Setup Awal VPS](#4-setup-awal-vps)
5. [Install Dependency Server](#5-install-dependency-server)
6. [Setup MySQL](#6-setup-mysql)
7. [Deploy Backend Laravel](#7-deploy-backend-laravel)
8. [Setup Nginx + SSL Backend](#8-setup-nginx--ssl-backend)
9. [Setup Queue Worker Laravel](#9-setup-queue-worker-laravel)
10. [Deploy Frontend ke Vercel](#10-deploy-frontend-ke-vercel)
11. [Verifikasi Final](#11-verifikasi-final)
12. [Perintah Maintenance](#12-perintah-maintenance)

---

## 1. Ringkasan Arsitektur Deployment

Recommended production topology:

- **Frontend:** Vercel, root folder `frontend`, output Vite dari folder `dist`.
- **Backend API:** VPS Ubuntu, root aplikasi di `/var/www/employee-training-web/backend`.
- **Web server:** Nginx mengarah ke `backend/public`.
- **Runtime backend:** PHP 8.3 FPM, bukan PM2.
- **Database:** MySQL/MariaDB lokal di VPS atau database managed.
- **Queue:** Laravel queue dengan driver `database`, dijalankan oleh Supervisor.

Contoh domain yang dipakai di dokumen ini:

- Frontend: `https://training.example.com`
- Backend API: `https://api.training.example.com`

Ganti semua domain contoh dengan domain production milik project.

---

## 2. Prasyarat Lokal Windows

Install tools berikut di Windows:

- PHP 8.3 atau lebih baru
- Composer
- Node.js 22 LTS atau minimal versi yang kompatibel dengan Vite 8
- Git
- MySQL client jika ingin test koneksi database dari lokal

Validasi dari PowerShell:

```powershell
php -v
composer -V
node -v
npm -v
git --version
```

Struktur project lokal:

```text
employee-training-web/
  backend/   # Laravel 13
  frontend/  # React + Vite
```

---

## 3. Validasi Sebelum Deploy

Jalankan dari Windows PowerShell.

### 3.1 Backend Laravel

```powershell
cd backend
composer install
Copy-Item .env.example .env -ErrorAction SilentlyContinue
php artisan key:generate
php artisan migrate --force
php artisan test
```

Jika database lokal belum tersedia, sesuaikan dulu `backend/.env`.

### 3.2 Frontend React Vite

```powershell
cd frontend
npm install
npm run check
```

`npm run check` menjalankan lint, test utility, dan build frontend.

### 3.3 Environment Lokal Frontend

File `frontend/.env.example`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api
VITE_API_TIMEOUT=15000
```

Untuk production, `VITE_API_BASE_URL` harus mengarah ke backend HTTPS dan tetap memakai suffix `/api`.

---

## 4. Setup Awal VPS

Login ke VPS:

```bash
ssh ubuntu@IP_VPS_ANDA
```

Update server dan aktifkan firewall dasar:

```bash
sudo apt update
sudo apt upgrade -y
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

---

## 5. Install Dependency Server

Install Nginx, MySQL, PHP 8.3 FPM, Composer dependency, Node.js, dan Supervisor:

```bash
sudo apt install -y nginx mysql-server git unzip curl supervisor
sudo apt install -y php8.3-fpm php8.3-cli php8.3-common php8.3-mysql php8.3-mbstring php8.3-xml php8.3-curl php8.3-zip php8.3-bcmath php8.3-gd
```

Install Composer jika belum tersedia:

```bash
curl -sS https://getcomposer.org/installer -o composer-setup.php
sudo php composer-setup.php --install-dir=/usr/local/bin --filename=composer
rm composer-setup.php
composer -V
```

Install Node.js 22 LTS jika backend asset build Laravel dibutuhkan di server:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

---

## 6. Setup MySQL

Masuk ke MySQL:

```bash
sudo mysql
```

Buat database dan user production:

```sql
CREATE DATABASE employee_training CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'employee_training'@'localhost' IDENTIFIED BY 'GANTI_PASSWORD_KUAT';
GRANT ALL PRIVILEGES ON employee_training.* TO 'employee_training'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Gunakan kredensial ini di `backend/.env` production.

---

## 7. Deploy Backend Laravel

### 7.1 Clone Source Code

```bash
sudo mkdir -p /var/www/employee-training-web
sudo chown -R ubuntu:www-data /var/www/employee-training-web
cd /var/www/employee-training-web
git clone https://github.com/USERNAME/employee-training-web.git .
```

Jika source code dikirim manual dari Windows, upload folder project ke path yang sama. Pastikan folder `backend` dan `frontend` tetap berada di root repository.

### 7.2 Buat Environment Backend

Buat file `/var/www/employee-training-web/backend/.env`:

```env
APP_NAME="Employee Training"
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=https://api.training.example.com
FRONTEND_URL=https://training.example.com
CORS_ALLOWED_ORIGINS=https://training.example.com

APP_LOCALE=en
APP_FALLBACK_LOCALE=en
APP_FAKER_LOCALE=en_US

LOG_CHANNEL=stack
LOG_STACK=single
LOG_LEVEL=error

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=employee_training
DB_USERNAME=employee_training
DB_PASSWORD=GANTI_PASSWORD_KUAT

SESSION_DRIVER=database
SESSION_LIFETIME=120
SESSION_ENCRYPT=false
SESSION_PATH=/
SESSION_DOMAIN=null

BROADCAST_CONNECTION=log
FILESYSTEM_DISK=local
QUEUE_CONNECTION=database

CACHE_STORE=database

MAIL_MAILER=log
MAIL_FROM_ADDRESS="noreply@training.example.com"
MAIL_FROM_NAME="${APP_NAME}"

VITE_APP_NAME="${APP_NAME}"
```

Generate `APP_KEY` setelah file `.env` dibuat:

```bash
cd /var/www/employee-training-web/backend
php artisan key:generate
```

### 7.3 Install, Build, dan Optimize Backend

```bash
cd /var/www/employee-training-web/backend
composer install --no-dev --optimize-autoloader
npm install
npm run build
php artisan migrate --force
php artisan storage:link
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

Set permission Laravel:

```bash
sudo chown -R ubuntu:www-data /var/www/employee-training-web/backend
sudo chmod -R 775 /var/www/employee-training-web/backend/storage
sudo chmod -R 775 /var/www/employee-training-web/backend/bootstrap/cache
```

Catatan:

- Project menyimpan file material di `storage/app`, jadi folder `storage` harus writable oleh web server.
- Endpoint file download dilayani oleh Laravel API, bukan oleh Vercel.
- Certificate PDF memakai `barryvdh/laravel-dompdf`; pastikan extension PHP yang dibutuhkan sudah aktif.

---

## 8. Setup Nginx + SSL Backend

Buat file `/etc/nginx/sites-available/employee-training-api`:

```nginx
server {
    listen 80;
    server_name api.training.example.com;
    root /var/www/employee-training-web/backend/public;

    index index.php index.html;

    client_max_body_size 55M;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

Aktifkan site:

```bash
sudo ln -sf /etc/nginx/sites-available/employee-training-api /etc/nginx/sites-enabled/employee-training-api
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

Pasang SSL Let's Encrypt setelah DNS `api.training.example.com` mengarah ke IP VPS:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.training.example.com --agree-tos -m email_anda@example.com --redirect
```

---

## 9. Setup Queue Worker Laravel

Project memakai `QUEUE_CONNECTION=database`. Jalankan queue worker dengan Supervisor.

Buat file `/etc/supervisor/conf.d/employee-training-worker.conf`:

```ini
[program:employee-training-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/employee-training-web/backend/artisan queue:work database --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=1
redirect_stderr=true
stdout_logfile=/var/www/employee-training-web/backend/storage/logs/worker.log
stopwaitsecs=3600
```

Aktifkan worker:

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start employee-training-worker:*
sudo supervisorctl status
```

Jika fitur queue belum dipakai di production, bagian ini tetap aman disiapkan karena Laravel akan menunggu job dari tabel `jobs`.

---

## 10. Deploy Frontend ke Vercel

Frontend project ini adalah React SPA berbasis Vite.

Di dashboard Vercel:

- Import repository `employee-training-web`.
- Set **Root Directory** ke `frontend`.
- Set **Framework Preset** ke `Vite`.
- Build command: `npm run build`.
- Output directory: `dist`.
- Pastikan file `frontend/vercel.json` ikut terdeploy untuk SPA fallback.

Tambahkan Environment Variables:

```env
VITE_API_BASE_URL=https://api.training.example.com/api
VITE_API_TIMEOUT=15000
```

Setelah deploy frontend selesai, update backend `.env`:

```env
FRONTEND_URL=https://training.example.com
CORS_ALLOWED_ORIGINS=https://training.example.com
```

Lalu refresh config backend:

```bash
cd /var/www/employee-training-web/backend
php artisan config:clear
php artisan config:cache
sudo systemctl reload php8.3-fpm
```

---

## 11. Verifikasi Final

Backend:

```bash
curl -I https://api.training.example.com/up
curl https://api.training.example.com/
```

Expected:

- `/up` mengembalikan status HTTP 200.
- `/` mengembalikan JSON berisi `application`, `version`, dan `status`.

Frontend:

- Buka `https://training.example.com`.
- Login memakai data user yang tersedia di database production.
- Pastikan request API menuju `https://api.training.example.com/api`.
- Pastikan upload/download material dan download certificate PDF berjalan.

Jika terjadi CORS error, cek:

- `VITE_API_BASE_URL` di Vercel harus memakai backend HTTPS + `/api`.
- `CORS_ALLOWED_ORIGINS` di backend harus berisi origin frontend tanpa trailing slash.
- Jalankan ulang `php artisan config:cache` setelah mengubah `.env`.

---

## 12. Perintah Maintenance

### Update Backend

```bash
cd /var/www/employee-training-web
git pull
cd backend
composer install --no-dev --optimize-autoloader
npm install
npm run build
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
sudo supervisorctl restart employee-training-worker:*
sudo systemctl reload php8.3-fpm
```

### Update Frontend

Push perubahan ke branch yang terhubung ke Vercel. Vercel akan otomatis menjalankan:

```bash
npm install
npm run build
```

### Logs Backend

```bash
cd /var/www/employee-training-web/backend
tail -f storage/logs/laravel.log
sudo supervisorctl tail -f employee-training-worker:employee-training-worker_00
sudo journalctl -u php8.3-fpm -f
sudo tail -f /var/log/nginx/error.log
```

### Clear Cache Laravel

```bash
cd /var/www/employee-training-web/backend
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### Mode Maintenance

```bash
cd /var/www/employee-training-web/backend
php artisan down
php artisan up
```
