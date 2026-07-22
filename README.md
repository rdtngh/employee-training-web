# Our KP Project

A little bit of documentation

## 🛠 Tech Stack

### Frontend
- React
- Vite
- JavaScript

### Backend
- Laravel
- PHP
- Composer

### Database
- MySQL

---

# 📁 Struktur Project

```text
Hospital-Training/
│
├── fe-in/        # React + Vite
│
└── be-in/        # Laravel
```

---

# 📌 Prasyarat

Pastikan software berikut sudah terinstall.

- Node.js
- npm
- PHP
- Composer
- MySQL / Laragon / XAMPP
- Git
- VS Code

---

# ⚛️ Instalasi Frontend (React + Vite)

## 1. Masuk ke folder project

```bash
cd projek-projekan
```

## 2. Masuk ke folder frontend

```bash
cd fe-in
```

## 3. Install dependency

```bash
npm install
```

## 4. Jalankan React

```bash
npm run dev
```

Jika berhasil akan muncul

```text
http://localhost:5173
```

Buka browser dan akses alamat tersebut.

---

# 🛠 Instalasi Backend (Laravel)

Kembali ke folder utama project.

```bash
cd ..
```

Masuk ke folder backend

```bash
cd be-in
```

Jalankan Laravel

```bash
composer run serve
```

Jika berhasil akan muncul

```text
http://127.0.0.1:8000
```

---

# 🎯 Verifikasi Backend

Backend dianggap berhasil jika browser menampilkan halaman default Laravel.

---

# ▶️ Menjalankan Project

## Menjalankan Frontend

Masuk ke folder frontend

```bash
cd fe-in
```

Jalankan

```bash
npm run dev
```

Frontend akan berjalan pada

```text
http://localhost:5173
```

---

## Menjalankan Backend

Buka terminal baru.

Masuk ke folder backend

```bash
cd be-in
```

Jalankan

```bash
composer run serve
```

Backend akan berjalan pada

```text
http://127.0.0.1:8000
```

Catatan upload materi: gunakan `composer run serve`, bukan `php artisan serve` biasa. Script ini menjalankan Laravel dengan `upload_max_filesize=50M` dan `post_max_size=55M`, sehingga file PPT/PPTX dan materi lain sampai 50MB dapat diterima.

---
