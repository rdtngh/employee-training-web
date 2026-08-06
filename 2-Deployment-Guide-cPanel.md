# 14 - Deployment Guide cPanel
**Employee Training Web - React Vite Frontend + Laravel Backend di cPanel**

| | |
|---|---|
| **Versi Dokumen** | 1.0 |
| **Status** | Draft - Living Document |
| **Terakhir Diperbarui** | 6 Agustus 2026 |
| **Target Lokal** | Windows + PowerShell |
| **Frontend** | React 19 + Vite 8, upload hasil build ke `public_html` |
| **Backend** | Laravel 13 + PHP 8.3, deploy ke subdomain API cPanel |
| **Database** | MySQL / MariaDB dari cPanel |

> Dokumen ini menjelaskan cara memindahkan sistem ke hosting cPanel milik klien. Project ini memiliki dua aplikasi terpisah: frontend React Vite di folder `frontend` dan backend Laravel API di folder `backend`.

---

## Daftar Isi

1. [Ringkasan Arsitektur Deployment](#1-ringkasan-arsitektur-deployment)
2. [Prasyarat Hosting cPanel](#2-prasyarat-hosting-cpanel)
3. [Prasyarat Lokal Windows](#3-prasyarat-lokal-windows)
4. [Validasi Sebelum Deploy](#4-validasi-sebelum-deploy)
5. [Setup Domain dan Subdomain](#5-setup-domain-dan-subdomain)
6. [Setup Database MySQL cPanel](#6-setup-database-mysql-cpanel)
7. [Deploy Backend Laravel ke cPanel](#7-deploy-backend-laravel-ke-cpanel)
8. [Konfigurasi Environment Backend](#8-konfigurasi-environment-backend)
9. [Deploy Frontend React Vite ke cPanel](#9-deploy-frontend-react-vite-ke-cpanel)
10. [Migrasi Data dari Hosting Lama](#10-migrasi-data-dari-hosting-lama)
11. [SSL dan HTTPS](#11-ssl-dan-https)
12. [Verifikasi Final](#12-verifikasi-final)
13. [Perintah Maintenance](#13-perintah-maintenance)
14. [Troubleshooting](#14-troubleshooting)

---

## 1. Ringkasan Arsitektur Deployment

Recommended production topology di cPanel:

- **Frontend:** domain utama, contoh `https://training.example.com`, berisi hasil build Vite dari folder `frontend/dist`.
- **Backend API:** subdomain API, contoh `https://api.training.example.com`, document root mengarah ke folder `backend/public`.
- **Database:** MySQL/MariaDB yang dibuat dari menu cPanel.
- **Runtime backend:** PHP 8.3 atau lebih baru.
- **Queue:** Laravel memakai `QUEUE_CONNECTION=database`. Jika cPanel tidak mendukung queue worker permanen, jalankan worker via cron atau proses manual sesuai kebutuhan hosting.

Contoh domain yang dipakai di dokumen ini:

- Frontend: `https://training.example.com`
- Backend API: `https://api.training.example.com`

Ganti semua domain contoh dengan domain production milik klien.

Struktur ideal di hosting:

```text
/home/CPANEL_USER/
  employee-training-backend/
    app/
    bootstrap/
    config/
    database/
    public/
    resources/
    routes/
    storage/
    vendor/
    artisan
    composer.json
    composer.lock
    .env

  public_html/
    index.html
    assets/
    .htaccess
```

Catatan penting:

- File backend Laravel sebaiknya disimpan di luar `public_html`.
- Hanya folder `backend/public` yang boleh menjadi document root subdomain API.
- Jangan upload seluruh folder Laravel ke `public_html` jika file seperti `.env`, `app`, `config`, dan `storage` ikut terekspos publik.

---

## 2. Prasyarat Hosting cPanel

Pastikan hosting cPanel klien mendukung:

- PHP 8.3 atau lebih baru.
- Composer di Terminal cPanel, atau minimal bisa menjalankan Composer dari lokal lalu upload folder `vendor`.
- MySQL atau MariaDB.
- Subdomain dengan custom document root.
- SSL AutoSSL atau Let's Encrypt.
- File Manager atau FTP/SFTP.
- Terminal/SSH sangat disarankan.

PHP extensions yang perlu aktif:

- `bcmath`
- `ctype`
- `curl`
- `dom`
- `fileinfo`
- `gd`
- `json`
- `mbstring`
- `openssl`
- `pdo`
- `pdo_mysql`
- `tokenizer`
- `xml`
- `zip`

Limit PHP yang direkomendasikan:

```ini
memory_limit = 256M
upload_max_filesize = 50M
post_max_size = 55M
max_execution_time = 120
max_input_time = 120
```

Jika menu **Select PHP Version** tersedia di cPanel, pilih PHP 8.3+ dan aktifkan extension di atas.

---

## 3. Prasyarat Lokal Windows

Install tools berikut di Windows:

- PHP 8.3 atau lebih baru.
- Composer.
- Node.js 22 LTS atau minimal versi yang kompatibel dengan Vite 8.
- Git.
- MySQL client atau phpMyAdmin jika perlu memindahkan database.

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

## 4. Validasi Sebelum Deploy

Jalankan dari Windows PowerShell sebelum upload ke cPanel.

### 4.1 Backend Laravel

```powershell
cd backend
composer install
Copy-Item .env.example .env -ErrorAction SilentlyContinue
php artisan key:generate
php artisan migrate --force
php artisan test
```

Jika database lokal belum tersedia, sesuaikan dulu `backend/.env`.

### 4.2 Frontend React Vite

```powershell
cd frontend
npm install
npm run check
```

`npm run check` menjalankan lint, test utility, dan build frontend.

### 4.3 Environment Frontend Production

Buat file `frontend/.env.production`:

```env
VITE_API_BASE_URL=https://api.training.example.com/api
VITE_API_TIMEOUT=15000
```

Untuk production, `VITE_API_BASE_URL` harus:

- Memakai HTTPS.
- Mengarah ke subdomain backend API.
- Tetap memakai suffix `/api`.
- Tidak memakai trailing slash setelah `/api`.

Contoh benar:

```env
VITE_API_BASE_URL=https://api.training.example.com/api
```

Contoh salah:

```env
VITE_API_BASE_URL=https://training.example.com
VITE_API_BASE_URL=https://api.training.example.com/api/
VITE_API_BASE_URL=http://api.training.example.com/api
```

---

## 5. Setup Domain dan Subdomain

Ada dua pilihan umum.

### 5.1 Pilihan A: Frontend di Domain Utama, API di Subdomain

Rekomendasi:

```text
https://training.example.com       -> frontend React
https://api.training.example.com   -> backend Laravel API
```

Di cPanel:

1. Buka menu **Domains** atau **Subdomains**.
2. Pastikan domain utama mengarah ke `public_html`.
3. Buat subdomain `api.training.example.com`.
4. Set document root subdomain API ke:

```text
/home/CPANEL_USER/employee-training-backend/public
```

Jika cPanel tidak mengizinkan document root ke luar `public_html`, minta bantuan hosting provider untuk mengubah document root subdomain API.

### 5.2 Pilihan B: Frontend dan API di Subfolder

Contoh:

```text
https://training.example.com        -> frontend React
https://training.example.com/api    -> backend API
```

Pilihan ini tidak direkomendasikan untuk project ini karena Laravel API dan React SPA lebih mudah dikelola jika dipisah lewat subdomain. Gunakan pilihan ini hanya jika hosting tidak bisa membuat subdomain.

---

## 6. Setup Database MySQL cPanel

Di cPanel:

1. Buka **MySQL Databases**.
2. Buat database, contoh:

```text
CPANEL_USER_training
```

3. Buat database user, contoh:

```text
CPANEL_USER_training_user
```

4. Set password yang kuat.
5. Tambahkan user ke database.
6. Berikan privilege **ALL PRIVILEGES**.

Simpan data berikut untuk `.env` backend:

```text
DB_HOST=localhost
DB_DATABASE=CPANEL_USER_training
DB_USERNAME=CPANEL_USER_training_user
DB_PASSWORD=PASSWORD_DATABASE
```

Catatan:

- Di sebagian hosting, `DB_HOST` bukan `localhost`, melainkan host khusus seperti `mysql.example.com`. Ikuti informasi dari cPanel atau provider hosting.
- Nama database dan username biasanya otomatis diberi prefix username cPanel.

---

## 7. Deploy Backend Laravel ke cPanel

### 7.1 Upload Source Backend

Upload folder `backend` ke luar `public_html`, contoh:

```text
/home/CPANEL_USER/employee-training-backend
```

Isi folder tersebut harus seperti:

```text
employee-training-backend/
  app/
  bootstrap/
  config/
  database/
  public/
  resources/
  routes/
  storage/
  tests/
  artisan
  composer.json
  composer.lock
```

Jangan upload folder `node_modules`.

### 7.2 Install Dependency Backend via Terminal cPanel

Masuk ke Terminal cPanel:

```bash
cd ~/employee-training-backend
composer install --no-dev --optimize-autoloader
```

Jika command `composer` tidak tersedia, coba:

```bash
php composer.phar install --no-dev --optimize-autoloader
```

Jika Composer sama sekali tidak tersedia di hosting:

1. Jalankan Composer dari lokal:

```powershell
cd backend
composer install --no-dev --optimize-autoloader
```

2. Upload folder `vendor` dari lokal ke:

```text
/home/CPANEL_USER/employee-training-backend/vendor
```

### 7.3 Permission Folder Laravel

Folder berikut harus writable:

```text
storage/
bootstrap/cache/
```

Di Terminal cPanel:

```bash
cd ~/employee-training-backend
chmod -R 775 storage bootstrap/cache
```

Jika masih error permission, gunakan File Manager cPanel untuk memastikan folder `storage` dan `bootstrap/cache` bisa ditulis oleh PHP.

---

## 8. Konfigurasi Environment Backend

Buat file:

```text
/home/CPANEL_USER/employee-training-backend/.env
```

Isi contoh `.env` production:

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
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=CPANEL_USER_training
DB_USERNAME=CPANEL_USER_training_user
DB_PASSWORD=PASSWORD_DATABASE

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

Generate `APP_KEY`:

```bash
cd ~/employee-training-backend
php artisan key:generate
```

Jalankan migrasi database:

```bash
php artisan migrate --force
```

Jika ini deployment baru dan butuh data awal:

```bash
php artisan db:seed --force
```

Buat storage link:

```bash
php artisan storage:link
```

Optimize Laravel:

```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

Catatan:

- Setelah mengubah `.env`, selalu jalankan `php artisan config:clear` lalu `php artisan config:cache`.
- `APP_DEBUG=false` wajib untuk production.
- `CORS_ALLOWED_ORIGINS` harus berisi URL frontend tanpa trailing slash.

---

## 9. Deploy Frontend React Vite ke cPanel

### 9.1 Build Frontend

Dari Windows PowerShell:

```powershell
cd frontend
npm install
npm run build
```

Output build ada di:

```text
frontend/dist/
```

### 9.2 Upload Hasil Build ke public_html

Upload seluruh isi folder `frontend/dist` ke:

```text
/home/CPANEL_USER/public_html
```

Yang diupload adalah isi `dist`, bukan folder `dist`-nya.

Contoh hasil di `public_html`:

```text
public_html/
  index.html
  assets/
  .htaccess
```

### 9.3 Pastikan .htaccess Frontend Ada

Untuk React SPA, refresh halaman seperti `/login` atau `/dashboard` perlu fallback ke `index.html`.

Pastikan file berikut ada:

```text
public_html/.htaccess
```

Isi `.htaccess` frontend:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  RewriteRule ^index\.html$ - [L]

  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  RewriteRule . /index.html [L]
</IfModule>
```

Jika `.htaccess` tidak ikut terupload karena file hidden, upload manual dari:

```text
frontend/public/.htaccess
```

---

## 10. Migrasi Data dari Hosting Lama

Jika sistem sudah punya data di hosting lama, lakukan backup dan restore.

### 10.1 Export Database Lama

Via phpMyAdmin hosting lama:

1. Pilih database lama.
2. Klik **Export**.
3. Pilih mode **Quick** atau **Custom**.
4. Format `SQL`.
5. Download file `.sql`.

### 10.2 Import Database ke cPanel Baru

Via phpMyAdmin cPanel baru:

1. Pilih database baru.
2. Klik **Import**.
3. Upload file `.sql`.
4. Jalankan import.

Setelah import, jalankan migrasi terbaru:

```bash
cd ~/employee-training-backend
php artisan migrate --force
```

### 10.3 Migrasi File Upload

File upload Laravel umumnya berada di:

```text
backend/storage/app/
```

Backup folder `storage/app` dari hosting lama, lalu upload ke:

```text
/home/CPANEL_USER/employee-training-backend/storage/app
```

Pastikan permission folder tetap writable:

```bash
cd ~/employee-training-backend
chmod -R 775 storage bootstrap/cache
```

---

## 11. SSL dan HTTPS

Di cPanel:

1. Buka **SSL/TLS Status** atau **AutoSSL**.
2. Aktifkan SSL untuk:

```text
training.example.com
api.training.example.com
```

3. Pastikan keduanya bisa dibuka dengan HTTPS.

Setelah SSL aktif, pastikan env production memakai HTTPS:

Frontend:

```env
VITE_API_BASE_URL=https://api.training.example.com/api
```

Backend:

```env
APP_URL=https://api.training.example.com
FRONTEND_URL=https://training.example.com
CORS_ALLOWED_ORIGINS=https://training.example.com
```

Jika sebelumnya build frontend masih memakai HTTP, build ulang frontend dan upload ulang isi `dist`.

---

## 12. Verifikasi Final

### 12.1 Verifikasi Backend API

Buka di browser:

```text
https://api.training.example.com
```

Lalu test endpoint API login dengan browser devtools atau Postman:

```text
POST https://api.training.example.com/api/login
```

Jika endpoint login memberi response validasi atau credential invalid, backend sudah terpanggil.

### 12.2 Verifikasi Frontend

Buka:

```text
https://training.example.com
```

Cek:

- Halaman landing tampil.
- Halaman login tampil.
- Login berhasil.
- Request API menuju `https://api.training.example.com/api`.
- Dashboard sesuai role tampil.
- Upload material berhasil.
- Download material berhasil.
- Generate/download certificate berhasil.

### 12.3 Verifikasi CORS

Jika login gagal di browser, buka DevTools lalu cek tab Console dan Network.

Pastikan:

- Frontend tidak memanggil `http://127.0.0.1:8000/api`.
- Frontend memanggil `https://api.training.example.com/api`.
- Backend `.env` punya `CORS_ALLOWED_ORIGINS=https://training.example.com`.
- Laravel config cache sudah direfresh.

Refresh cache Laravel:

```bash
cd ~/employee-training-backend
php artisan config:clear
php artisan config:cache
```

---

## 13. Perintah Maintenance

### 13.1 Update Backend

Upload perubahan backend ke:

```text
/home/CPANEL_USER/employee-training-backend
```

Lalu jalankan:

```bash
cd ~/employee-training-backend
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### 13.2 Update Frontend

Dari lokal:

```powershell
cd frontend
npm install
npm run build
```

Upload ulang isi:

```text
frontend/dist/
```

ke:

```text
/home/CPANEL_USER/public_html
```

### 13.3 Clear Cache Laravel

```bash
cd ~/employee-training-backend
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### 13.4 Cek Log Laravel

```bash
cd ~/employee-training-backend
tail -f storage/logs/laravel.log
```

Jika command `tail` tidak tersedia, buka file berikut lewat File Manager:

```text
employee-training-backend/storage/logs/laravel.log
```

### 13.5 Mode Maintenance

Aktifkan maintenance:

```bash
cd ~/employee-training-backend
php artisan down
```

Matikan maintenance:

```bash
php artisan up
```

---

## 14. Troubleshooting

### 14.1 Halaman Frontend 404 Saat Refresh

Penyebab:

- File `.htaccess` frontend belum ada di `public_html`.
- Apache rewrite belum aktif.

Solusi:

- Upload `frontend/public/.htaccess` ke `public_html/.htaccess`.
- Pastikan isi `.htaccess` sesuai bagian [9.3](#93-pastikan-htaccess-frontend-ada).

### 14.2 API 404 atau Menampilkan File List

Penyebab:

- Document root subdomain API tidak mengarah ke `backend/public`.

Solusi:

- Ubah document root `api.training.example.com` ke:

```text
/home/CPANEL_USER/employee-training-backend/public
```

### 14.3 Error 500 dari Backend

Penyebab umum:

- `.env` belum dibuat.
- `APP_KEY` kosong.
- Dependency `vendor` belum terinstall.
- Permission `storage` atau `bootstrap/cache` tidak writable.
- Versi PHP tidak cocok.
- Database credential salah.

Solusi:

```bash
cd ~/employee-training-backend
php artisan optimize:clear
php artisan key:generate
chmod -R 775 storage bootstrap/cache
```

Lalu cek:

```text
storage/logs/laravel.log
```

### 14.4 Composer Gagal Karena PHP Version

Project ini membutuhkan PHP 8.3 atau lebih baru.

Solusi:

- Ubah PHP version di cPanel ke PHP 8.3+.
- Jika hosting tidak menyediakan PHP 8.3+, pindah ke paket hosting yang mendukung PHP 8.3+ atau gunakan VPS.

### 14.5 CORS Error Saat Login

Penyebab:

- `VITE_API_BASE_URL` salah.
- `CORS_ALLOWED_ORIGINS` belum sesuai.
- Laravel masih memakai config cache lama.

Solusi:

Frontend `.env.production`:

```env
VITE_API_BASE_URL=https://api.training.example.com/api
```

Backend `.env`:

```env
CORS_ALLOWED_ORIGINS=https://training.example.com
FRONTEND_URL=https://training.example.com
```

Refresh cache:

```bash
cd ~/employee-training-backend
php artisan config:clear
php artisan config:cache
```

Build ulang frontend jika `.env.production` berubah:

```powershell
cd frontend
npm run build
```

### 14.6 Upload File Gagal

Penyebab:

- Limit `upload_max_filesize` atau `post_max_size` terlalu kecil.
- Folder `storage` tidak writable.

Solusi:

- Set PHP limit:

```ini
upload_max_filesize = 50M
post_max_size = 55M
memory_limit = 256M
```

- Set permission:

```bash
cd ~/employee-training-backend
chmod -R 775 storage bootstrap/cache
```

### 14.7 Download File atau Certificate Gagal

Penyebab:

- File upload belum ikut dimigrasikan.
- `storage:link` belum dibuat.
- Permission storage bermasalah.

Solusi:

```bash
cd ~/employee-training-backend
php artisan storage:link
chmod -R 775 storage bootstrap/cache
```

Pastikan folder berikut sudah dipindahkan dari hosting lama:

```text
storage/app/
```

### 14.8 Queue Tidak Jalan di Shared Hosting

Project memakai:

```env
QUEUE_CONNECTION=database
```

Jika fitur yang memakai queue tidak berjalan otomatis, ada dua opsi:

1. Jalankan queue worker manual dari Terminal:

```bash
cd ~/employee-training-backend
php artisan queue:work database --tries=3 --stop-when-empty
```

2. Tambahkan Cron Job cPanel setiap menit:

```bash
cd /home/CPANEL_USER/employee-training-backend && php artisan queue:work database --tries=3 --stop-when-empty
```

Catatan:

- Shared hosting biasanya tidak mendukung proses worker permanen.
- Untuk traffic besar atau job panjang, VPS lebih direkomendasikan.

---
