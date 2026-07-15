# Dokumentasi Project

Project ini merupakan frontend **Sistem Pelatihan Karyawan Rumah Sakit Advent Bandar Lampung**. Aplikasi dibangun menggunakan React dan Vite, sedangkan backend direncanakan menggunakan Laravel.

Dokumentasi ini disusun berdasarkan implementasi frontend yang tersedia saat ini. Tujuannya adalah membantu:

- Backend Developer memahami kebutuhan data, aturan bisnis, dan endpoint yang perlu disediakan.
- Frontend Developer baru memahami struktur aplikasi, hubungan antarmodul, dan aliran data.
- System Analyst memetakan role, halaman, status, dan ketergantungan proses pelatihan.

> Dokumentasi menjelaskan kondisi project apa adanya. Dummy data, hardcode, inkonsistensi kontrak, route yang belum tersedia, dan bagian yang belum siap integrasi dicatat sebagai temuan; tidak diperbaiki melalui dokumentasi ini.

## Teknologi Utama

| Bagian | Teknologi |
|---|---|
| Frontend | React 19 |
| Build tool | Vite |
| Routing | React Router |
| HTTP client | Axios |
| State lokal | React state dan hooks |
| Penyimpanan browser | `localStorage` dan `sessionStorage` |
| Backend target | Laravel REST API |
| Autentikasi yang diharapkan | Bearer token |

## Ruang Lingkup Aplikasi

Aplikasi memiliki empat area akses:

- **Public**: landing page dan login.
- **Employee**: dashboard, pre-test, materi, post-test, retry, dan download sertifikat.
- **Admin**: dashboard, kelola materi, kelola ujian, hasil ujian, statistik, dan sertifikat.
- **Super Admin**: seluruh fitur Admin ditambah kelola pengguna.

## Daftar Dokumentasi

### 1. `README_INDEX.md`

Dokumen utama dan titik masuk dokumentasi. Berisi gambaran project, daftar dokumen, urutan membaca, dan status kesiapan modul secara ringkas.

### 2. `README_BUSINESS_FLOW.md`

Menjelaskan alur bisnis aplikasi secara langkah demi langkah, meliputi:

- Landing page dan autentikasi.
- Hak akses setiap role.
- Flow Admin dan Super Admin.
- Flow pelatihan Employee.
- Pre-test, pembukaan materi, checklist materi, post-test, re-attempt, sertifikat, dan logout.
- Perubahan status serta kondisi sebelum dan setelah setiap tahap.

### 3. `README_FRONTEND_ARCHITECTURE.md`

Menjelaskan cara frontend disusun dan bekerja, meliputi:

- Struktur folder.
- Pages, reusable components, hooks, services, routes, utilities, dan assets.
- State management dan penyimpanan browser.
- Aliran data dari halaman sampai service.
- Bagian yang sudah memakai API dan bagian yang masih dummy.
- Panduan maintainability dan penambahan fitur.

### 4. `README_BACKEND_INTEGRATION.md`

Dokumen utama untuk Backend Developer Laravel, meliputi:

- Struktur halaman dan role.
- Business rules.
- Entity dan relasi sistem.
- Analisis setiap service frontend.
- Dummy data yang harus diganti API.
- Data yang dibutuhkan setiap halaman.
- Status yang digunakan frontend.
- Rekomendasi endpoint REST API.
- Validasi backend dan hak akses.
- Catatan integrasi dan potensi masalah.

## Urutan Membaca

```text
README_INDEX.md
       ↓
README_BUSINESS_FLOW.md
       ↓
README_FRONTEND_ARCHITECTURE.md
       ↓
README_BACKEND_INTEGRATION.md
```

Urutan tersebut direkomendasikan karena:

1. Pembaca memahami ruang lingkup aplikasi terlebih dahulu.
2. Pembaca memahami proses bisnis dan dependency antartahap.
3. Pembaca memahami bagaimana proses tersebut diwujudkan di frontend.
4. Pembaca baru memetakan kebutuhan tersebut menjadi API dan model Laravel.

## Peta Modul dan Kesiapan Integrasi

| Modul | Kondisi frontend saat ini | Kesiapan API |
|---|---|---|
| Authentication | Sudah menggunakan Axios | Tinggi |
| User Management | Sudah menggunakan Axios; mapping respons perlu diselaraskan | Menengah–tinggi |
| Training | Service tersedia tetapi belum dipakai halaman | Menengah |
| Material Admin/Super Admin | CRUD dan multipart upload sudah menggunakan API | Tinggi |
| Material Employee | Daftar dan progress masih dummy | Rendah–menengah |
| Detail/checklist materi | Link tersedia, route dan halaman detail belum tersedia | Rendah |
| Kelola Ujian | CRUD masih menggunakan `localStorage` | Rendah |
| Pre-Test | Soal dan penilaian masih dummy di browser | Rendah |
| Post-Test | Status, attempt, retry, dan penilaian masih dummy | Rendah |
| Dashboard | Konten informasional hardcode | Tidak wajib API |
| Statistik | Masih dummy | Rendah |
| Export SPSS | Masih menghasilkan file teks dummy | Rendah |
| Sertifikat Admin/Super Admin | Masih placeholder | Rendah |
| Download sertifikat Employee | Jalur API sudah disiapkan tetapi default masih dummy | Menengah |

## Ringkasan Temuan Utama

1. Autentikasi, user, training, dan materi telah memiliki service berbasis Axios, walaupun tidak semuanya sudah dipakai penuh.
2. CRUD soal menggunakan penyimpanan lokal browser dan belum terhubung ke backend.
3. Penilaian pre-test dan post-test masih dilakukan di frontend menggunakan jawaban benar yang berada dalam source.
4. Progress materi Employee masih dummy dan belum memiliki endpoint completion.
5. Link `/employee/material/:id` sudah digunakan, tetapi route dan halaman detailnya belum tersedia.
6. Operasi materi masih menggunakan `DEFAULT_TRAINING_ID = 1`.
7. Role memiliki label tampilan dan slug teknis yang belum sepenuhnya seragam.
8. Halaman hasil ujian saat ini berfungsi sebagai menu menuju statistik, export, dan sertifikat; belum menampilkan daftar hasil peserta.

## Prinsip Integrasi

- Backend menjadi sumber kebenaran untuk role, hak akses, progress, eligibility, attempt, nilai, kelulusan, retry, dan sertifikat.
- Endpoint Employee tidak boleh mengirim jawaban benar.
- Service layer frontend menjadi titik utama penggantian dummy data dengan request API.
- Kontrak respons perlu distandardisasi sebelum integrasi penuh.
- Seluruh aturan bisnis tetap harus divalidasi backend meskipun frontend telah membatasi tampilan atau navigasi.
