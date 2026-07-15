# Business Flow Aplikasi

## Gambaran Umum

Website ini mendukung proses pelatihan karyawan rumah sakit serta pengelolaan pengguna, materi, ujian, hasil, statistik, dan sertifikat.

Flow utama Employee yang tercermin pada frontend adalah:

```text
Landing Page
     ↓
Login
     ↓
Dashboard Employee
     ↓
Pre-Test
     ↓
Materi
     ↓
Seluruh Materi Selesai
     ↓
Post-Test
     ↓
Lulus / Tidak Lulus
     ↓
Sertifikat / Re-Attempt
     ↓
Logout
```

> Beberapa tahap sudah tergambar dalam UI tetapi belum memiliki implementasi lengkap. Secara khusus, detail materi dan aksi checklist/completion belum memiliki route atau halaman.

# Role dan Hak Akses

## Public

Pengguna yang belum login dapat mengakses:

- `/` — Landing Page.
- `/login` — Login.

## Employee

Employee dapat mengakses:

- Dashboard Employee.
- Pre-Test.
- Daftar Materi.
- Post-Test.
- Download sertifikat setelah lulus Post-Test.

## Admin

Admin dapat mengakses:

- Dashboard Admin.
- Kelola Materi.
- Kelola Ujian.
- Hasil Ujian.
- Statistik.
- Sertifikat.

## Super Admin

Super Admin memiliki fitur Admin dan tambahan:

- Kelola Pengguna.

## Matriks Hak Akses

| Fitur | Public | Employee | Admin | Super Admin |
|---|---:|---:|---:|---:|
| Landing/Login | Ya | Ya | Ya | Ya |
| Dashboard Employee | Tidak | Ya | Tidak | Tidak |
| Pre-Test/Post-Test | Tidak | Ya | Tidak | Tidak |
| Materi Employee | Tidak | Ya | Tidak | Tidak |
| Kelola Materi | Tidak | Tidak | Ya | Ya |
| Kelola Ujian | Tidak | Tidak | Ya | Ya |
| Statistik/Sertifikat peserta | Tidak | Tidak | Ya | Ya |
| Kelola Pengguna | Tidak | Tidak | Tidak | Ya |

# Landing Page

```text
Pengunjung membuka aplikasi
        ↓
Melihat identitas dan deskripsi sistem
        ↓
Menekan tombol LOG IN
        ↓
Masuk ke /login
```

Landing Page sepenuhnya statis dan tidak mengambil data backend.

# Login

## Input

- Username yang secara teknis dikirim sebagai `employee_number`.
- Password.

## Flow

```text
User mengisi employee number dan password
        ↓
Frontend memanggil POST /login
        ↓
Backend mengembalikan token dan user
        ↓
Frontend menyimpan token + user di localStorage
        ↓
Frontend membaca role
        ├─ role mengandung "super" → /superadmin
        ├─ role mengandung "admin" → /admin
        └─ selain itu             → /employee
```

Jika request gagal, frontend menampilkan `message` dari backend atau pesan umum.

## Proteksi Halaman

`ProtectedRoute` memeriksa token dan role hanya jika `VITE_REQUIRE_AUTH=true`.

```text
Membuka route terlindungi
        ↓
Apakah proteksi diaktifkan?
        ├─ Tidak → halaman langsung dibuka
        └─ Ya
            ↓
        Token tersedia?
            ├─ Tidak → /login
            └─ Ya
                ↓
        Role diizinkan?
            ├─ Ya    → halaman dibuka
            └─ Tidak → dashboard role user
```

Backend tetap wajib melakukan authorization karena proteksi frontend dapat dinonaktifkan melalui konfigurasi.

# Dashboard

## Dashboard Employee

Dashboard menampilkan teks sambutan, penjelasan sistem, dan empat langkah pelatihan:

1. Kerjakan Pre-Test.
2. Pelajari seluruh materi.
3. Selesaikan Post-Test.
4. Lihat hasil pembelajaran.

Data tersebut saat ini berasal dari `dashboardService`, bukan backend. Dashboard belum menampilkan nama user atau progress aktual.

## Dashboard Admin

Dashboard menjelaskan tanggung jawab Admin:

1. Mengelola materi.
2. Mengelola soal pre-test dan post-test.
3. Memantau hasil pelatihan.
4. Memastikan materi dan soal diperbarui.

## Dashboard Super Admin

Dashboard menjelaskan tanggung jawab Super Admin:

1. Mengelola pengguna.
2. Mengelola materi.
3. Mengelola soal.
4. Memantau hasil pelatihan.
5. Mengelola hak akses.

# Flow Employee

## 1. Pre-Test

### Sebelum dikerjakan

```text
Employee membuka /employee/pretest
        ↓
Frontend memuat test dan questions
        ↓
Jika response memiliki result
        ├─ Ya    → tampilkan hasil lama
        └─ Tidak → tampilkan dialog konfirmasi mulai
```

Jawaban sementara disimpan di `sessionStorage` dengan key `rsabl-pretest-answers`.

### Saat mengerjakan

- Satu soal ditampilkan pada satu waktu.
- Opsi dapat berupa object atau array.
- Tombol berikutnya tidak aktif sebelum soal saat ini dijawab.
- Employee dapat kembali ke soal sebelumnya.
- Pada soal terakhir, tombol berubah menjadi Submit.

### Submission

Payload yang dibentuk:

```json
{
  "test_id": 1,
  "answers": [
    {
      "question_id": 1,
      "answer": "a"
    }
  ]
}
```

Setelah berhasil:

- Hasil ditampilkan.
- Jawaban sementara dihapus.
- Hasil berisi skor, jumlah benar, jumlah salah, persentase, dan status lulus.

### Kondisi saat ini

Soal dan jawaban benar masih berada di `examService`. Penilaian dilakukan di browser. Backend nantinya harus mengambil alih proses tersebut.

## 2. Materi

### Sebelum Pre-Test selesai

```text
Employee membuka /employee/materi
        ↓
Frontend membaca training.pre_test_completed
        ↓
Nilai false
        ↓
Seluruh baris materi dinonaktifkan
        ↓
Dialog "Kerjakan Pre-Test untuk membuka Materi"
```

### Setelah Pre-Test selesai

```text
pre_test_completed = true
        ↓
Daftar materi dapat diklik
        ↓
Frontend mengarah ke /employee/material/{id}
```

Setiap materi memiliki:

- `id`
- `title`
- `completed`

Materi selesai ditampilkan menggunakan ikon checklist. Materi yang belum selesai menggunakan indikator kosong.

### Kesenjangan implementasi

- Route `/employee/material/:id` belum terdaftar.
- Halaman detail materi belum ada.
- Belum ada aksi frontend untuk menandai materi selesai.
- `post_test_unlocked` terdapat pada dummy data tetapi belum digunakan halaman.

## 3. Post-Test

### Sebelum seluruh materi selesai

```text
Employee membuka /employee/posttest
        ↓
Frontend membaca materials_completed
        ↓
Nilai false
        ↓
Post-Test dikunci
        ↓
Dialog "Selesaikan semua materi"
```

### Setelah seluruh materi selesai

```text
materials_completed = true
        ↓
Frontend membaca status Post-Test
        ├─ PASSED / FAILED → tampilkan hasil
        └─ status lain     → dialog konfirmasi mulai
```

Jawaban sementara disimpan di `sessionStorage` dengan key `rsabl-posttest-answers`.

Payload submit:

```json
{
  "post_test_id": 2,
  "training_id": 1,
  "answers": [
    {
      "question_id": "post-1",
      "answer": "a"
    }
  ]
}
```

## 4. Kondisi Lulus

```text
Submit Post-Test
        ↓
Nilai >= passing_grade
        ↓
status = PASSED
passed = true
certificate_available = true
        ↓
Tampilkan tombol Download Sertifikat
```

Frontend meminta file sertifikat berdasarkan training ID.

## 5. Kondisi Tidak Lulus

```text
Submit Post-Test
        ↓
Nilai < passing_grade
        ↓
status = FAILED
passed = false
        ↓
Apakah attempt < max_attempt?
        ├─ Ya    → can_retry = true
        └─ Tidak → can_retry = false
```

## 6. Re-Attempt

```text
Employee menekan Re Attempt
        ↓
Frontend meminta retry
        ↓
attempt bertambah
status kembali NOT_STARTED
nilai dan jawaban dibersihkan
        ↓
Dialog konfirmasi mulai ditampilkan lagi
```

Aturan retry saat ini hanya disimulasikan di frontend. Backend harus menentukan eligibility dan mencegah retry melebihi batas.

## 7. Download Sertifikat

```text
Post-Test PASSED
        ↓
certificate_available = true
        ↓
Employee menekan Download Sertifikat
        ↓
GET /certificates/{trainingId}/download
        ↓
Browser mengunduh file
```

Default saat ini masih file teks dummy kecuali `VITE_USE_DUMMY_DATA=false`.

# Flow Kelola Pengguna

Fitur hanya tersedia untuk Super Admin.

```text
Buka Kelola Pengguna
        ↓
Muat daftar user + opsi department/role
        ├─ Tambah user
        ├─ Edit user
        └─ Hapus user
```

## Tambah

Field wajib:

- User/nama.
- ID/employee number.
- Departemen.
- Role.

Setelah berhasil, daftar user dimuat ulang.

## Edit

Data user dibuka dalam dialog, divalidasi, dikirim ke service, lalu daftar dimuat ulang.

## Hapus

- User dengan label role tepat `Super Admin` tidak menampilkan tombol hapus.
- Pemeriksaan tersebut saat ini hanya ada di frontend.
- Backend wajib melarang penghapusan Super Admin sesuai aturan bisnis.

# Flow Kelola Materi

Digunakan bersama oleh Admin dan Super Admin.

## Daftar dan buka materi

```text
Buka halaman Kelola Materi
        ↓
GET /trainings/1/materials
        ↓
Tampilkan judul dan aksi Buka/Edit/Hapus
```

Tombol Buka membuka file pertama dari `material.files` pada tab baru.

## Upload satu materi

```text
Pilih satu file
        ↓
Isi judul file tersebut
        ↓
Konfirmasi
        ↓
POST /materials menggunakan multipart
```

## Upload banyak materi

```text
Pilih beberapa file
        ↓
Frontend membuat item terpisah untuk setiap file
        ↓
Isi satu judul untuk setiap file
        ↓
Konfirmasi
        ↓
POST /materials/bulk
        ↓
titles[] dan files[] dikirim berpasangan
```

Employee dapat menghapus satu file dari daftar pilihan atau menghapus seluruh pilihan sebelum submission.

## Edit dan hapus

- Edit dapat mengganti judul dan file.
- Update multipart dikirim melalui POST dengan `_method=PUT`.
- Delete meminta konfirmasi sebelum memanggil endpoint.

# Flow Kelola Ujian

Digunakan bersama oleh Admin dan Super Admin.

```text
Buka Kelola Ujian
        ↓
Muat daftar soal
        ├─ Tambah soal
        ├─ Edit soal
        └─ Hapus soal
```

Setiap soal memiliki:

- Pertanyaan.
- Opsi A, B, C, dan D.
- Satu jawaban benar.

Semua field wajib. Saat ini data disimpan di `localStorage` key `rsabl_exams`, bukan backend.

UI belum menyediakan pemilihan training, jenis test, atau urutan soal.

# Flow Hasil Ujian

Halaman Hasil Ujian saat ini merupakan menu accordion:

```text
Hasil Ujian
    ├─ Statistik
    │   ├─ Lihat Statistik
    │   └─ Export SPSS
    └─ Sertifikat
        └─ Lihat Sertifikat
```

Kedua accordion dapat dibuka secara independen.

# Flow Statistik

```text
Admin/Super Admin memilih Lihat Statistik
        ↓
Muat data statistik
        ↓
Tampilkan rata-rata, peserta, lulus, gagal,
nilai tertinggi, nilai terendah, dan persentase kelulusan
```

Data statistik saat ini dummy dan selalu merujuk training ID 1.

# Flow Sertifikat Admin/Super Admin

```text
Pilih Lihat Sertifikat
        ↓
Buka halaman certificate
        ↓
Tampilkan placeholder
```

Belum ada tabel sertifikat, filter, detail peserta, atau download administratif.

# Logout

```text
User menekan Logout
        ↓
POST /logout
        ↓
Token dan user dihapus dari localStorage
        ↓
Redirect ke Landing Page
```

Penghapusan data sesi lokal tetap dilakukan meskipun request logout gagal.

# Ringkasan Perubahan Status

| Tahap | Sebelum | Setelah berhasil |
|---|---|---|
| Pre-Test | Belum ada result | `pre_test_completed` diharapkan menjadi true |
| Materi | `completed=false` | `completed=true` per materi |
| Semua materi | `materials_completed=false` | `materials_completed=true` |
| Post-Test mulai | `NOT_STARTED` | Secara ideal `IN_PROGRESS`, tetapi belum digunakan |
| Post-Test lulus | Belum ada hasil | `PASSED`, `passed=true`, sertifikat tersedia |
| Post-Test gagal | Belum ada hasil | `FAILED`, `passed=false` |
| Retry | `FAILED`, `can_retry=true` | Attempt bertambah dan kembali `NOT_STARTED` |
| Sertifikat | Tidak tersedia | `certificate_available=true` setelah lulus |
