# Arsitektur Frontend

# Project Overview

Frontend dibangun sebagai Single Page Application menggunakan React, Vite, React Router, dan Axios. Arsitektur yang digunakan bersifat feature-oriented pada folder `pages` dan `components`, sedangkan akses data dipisahkan ke `services` dan sebagian orchestration state dipisahkan ke `hooks`.

Aliran umum aplikasi:

```text
Route
  ↓
Page
  ↓
Reusable Component / Feature Component
  ↓
Hook
  ↓
Service
  ↓
Axios API atau Dummy/Browser Storage
```

# Struktur Folder

```text
src/
├─ assets/
│  ├─ icons/
│  ├─ images/
│  └─ logo/
├─ components/
│  ├─ auth/
│  ├─ common/
│  ├─ dashboard/
│  ├─ employee/
│  ├─ exam/
│  ├─ landing/
│  ├─ login/
│  ├─ material/
│  ├─ statistics/
│  └─ user/
├─ hooks/
├─ pages/
│  ├─ admin/
│  ├─ employee/
│  ├─ public/
│  └─ superadmin/
├─ routes/
├─ services/
├─ styles/
└─ utils/
```

Folder `src/context` tidak ditemukan. Aplikasi tidak menggunakan React Context pada implementasi saat ini.

# Entry Point

## `main.jsx`

- Membuat React root.
- Membungkus aplikasi dengan `StrictMode`.
- Memuat global stylesheet.
- Merender `App`.

## `App.jsx`

Hanya merender `AppRouter`. Komponen ini menjadi batas sederhana antara bootstrap React dan routing aplikasi.

# Pages

Pages bertugas menjadi entry component untuk suatu route.

## Public

- `LandingPage`: menyusun Navbar, Hero, background, dan Footer.
- `LoginPage`: menyusun Navbar, LoginCard, background, dan Footer.

## Employee

- `DashboardEmployee`: memuat konten dashboard Employee.
- `EmployeePreTest`: mengelola lifecycle pre-test.
- `EmployeeMaterials`: memuat training dan progress daftar materi.
- `EmployeePostTest`: mengelola lock, attempt, result, retry, dan download sertifikat.

## Admin

Sebagian besar page Admin merupakan wrapper tipis:

- `ManageMaterial` → `ManageMaterialPage role="admin"`.
- `ManageExam` → `ManageExamPage role="admin"`.
- `ExamResult` → layout Admin + reusable `ExamResult`.
- `StatisticsPage` → service statistik + reusable dashboard.
- `CertificatePage` → service sertifikat + placeholder bersama.

## Super Admin

Strukturnya serupa Admin, dengan tambahan `UserManagement`.

Pendekatan wrapper tipis menghindari duplikasi implementasi Admin dan Super Admin.

# Components

## Auth

`ProtectedRoute`:

- Membaca token dan user dari `authService`.
- Menormalisasi role.
- Mengarahkan user tanpa token ke login.
- Mengarahkan user dengan role salah ke dashboard role-nya.
- Seluruh pemeriksaan dilewati jika `VITE_REQUIRE_AUTH` bukan `true`.

## Common dan Layout

- `Navbar`: digunakan Landing, Login, dan DashboardLayout.
- `Footer`: digunakan halaman public dan seluruh dashboard.
- `DashboardLayout`: menyusun Navbar, Sidebar, content area, backdrop mobile, dan Footer.
- `Sidebar`: menentukan menu berdasarkan role dan menjalankan logout.

## User

- `UserTable`: tabel daftar user dan aksi.
- `UserForm`: form reusable untuk add dan edit.
- `EditUserDialog`: membungkus `UserForm` mode edit.
- `DeleteUserDialog`: konfirmasi penghapusan.

## Material

- `ManageMaterialPage`: orchestration CRUD dan dialog.
- `MaterialTable`: daftar materi dan aksi.
- `MaterialForm`: reusable add/edit, termasuk multi-file dengan judul per file.
- `UploadMaterialDialog`: file picker satu atau banyak file.
- `EditMaterialDialog`: membungkus form edit.
- `MaterialConfirmDialog`: reusable confirmation dialog.
- `DeleteMaterialUploadDialog`: konfirmasi menghapus file dari daftar upload lokal.

## Exam

- `ManageExamPage`: orchestration CRUD soal.
- `ExamForm`: reusable add/edit question.
- `ExamTable` dan `ExamCard`: daftar dan representasi soal.
- Dialog add, edit, delete, dan confirmation.
- `ExamConfirmDialog`: dialog konfirmasi untuk ujian Employee.
- `ExamResultCard`: tampilan hasil lulus/gagal yang dipakai pre-test dan post-test.
- `ExamResult`: menu hasil ujian Admin/Super Admin.

## Employee

- `MaterialListCard`: daftar materi dan status checklist.
- `PreTestRequiredDialog`: pengunci materi sebelum pre-test selesai.

## Statistics

`StatisticsDashboard` menerima data melalui props dan hanya bertugas menampilkan metric serta state loading/error.

# Reusable Components

| Komponen | Digunakan oleh |
|---|---|
| `DashboardLayout` | Seluruh halaman role |
| `Navbar` | Public dan dashboard |
| `Footer` | Public dan dashboard |
| `ManageMaterialPage` | Admin dan Super Admin |
| `MaterialForm` | Add dan edit materi |
| `ManageExamPage` | Admin dan Super Admin |
| `ExamForm` | Add dan edit soal |
| `ExamResult` | Admin dan Super Admin |
| `ExamResultCard` | Pre-Test dan Post-Test |
| `StatisticsDashboard` | Admin dan Super Admin |
| `UserForm` | Add dan edit user |

# Hooks

## `useServiceData`

Hook loader generik yang mengelola:

- `data`
- `loading`
- `error`

Digunakan oleh dashboard, materi Employee, statistik, dan sertifikat.

## `useUsers`

Mengelola:

- Daftar user.
- Opsi department/role.
- Loading.
- Load, add, update, dan delete.

Setiap mutation berhasil diikuti reload daftar user.

## `useMaterials`

Mengelola daftar materi Admin/Super Admin dan operasi CRUD. Multi-file diarahkan ke bulk service jika `items.length > 1`.

## `useExam`

Mengelola:

- Daftar soal.
- Soal terpilih.
- Mode edit.
- Dialog delete.
- Validasi question/options/correct answer.
- CRUD melalui `examService`.

## `useSessionAnswers`

Mengelola jawaban sementara ujian dalam `sessionStorage`. Pre-test dan post-test memakai storage key berbeda.

# Services

| Service | Sumber data saat ini |
|---|---|
| `api` | Axios instance |
| `authService` | Laravel API yang diharapkan |
| `userService` | API untuk CRUD; metadata masih hardcode |
| `trainingService` | API, tetapi belum digunakan page |
| `materialService` | API Admin; dummy Employee |
| `examService` | Dummy dan `localStorage` |
| `dashboardService` | Object hardcode |
| `statisticsService` | Dummy |
| `certificateService` | Dummy; download API bersyarat |
| `crudStorage` | Browser `localStorage` atau memory store |

# Service Layer dan HTTP

`api.js` membuat Axios instance dengan:

- Base URL dari `VITE_API_BASE_URL`.
- Default `http://127.0.0.1:8000/api`.
- Timeout default 15 detik.
- Bearer token dari `localStorage`.
- JSON content type untuk payload biasa.
- Multipart content type otomatis untuk `FormData`.
- Pembersihan sesi ketika menerima status `401`.

Data flow API:

```text
UI event
  ↓
Page/feature handler
  ↓
Hook mutation atau service langsung
  ↓
Axios interceptor menambahkan Bearer token
  ↓
Laravel API
  ↓
Service melakukan mapping response
  ↓
Hook memperbarui state
  ↓
Component re-render
```

# Routing

Seluruh route berada dalam `src/routes/AppRouter.jsx` menggunakan `BrowserRouter`, `Routes`, dan `Route`.

## Public

- `/`
- `/login`

## Employee

- `/employee`
- `/employee/materi`
- `/employee/pretest`
- `/employee/posttest`

## Admin

- `/admin`
- `/admin/manage-materi`
- `/admin/manage-exam`
- `/admin/exam-results`
- `/admin/statistics`
- `/admin/certificates`

## Super Admin

- `/superadmin`
- `/superadmin/manage-user`
- `/superadmin/manage-materi`
- `/superadmin/manage-exam`
- `/superadmin/exam-results`
- `/superadmin/statistics`
- `/superadmin/certificates`

Semua path lain diarahkan ke `NotFoundPage`.

## Inkonsistensi route

`MaterialListCard` membuat link ke `/employee/material/{id}`, tetapi route tersebut tidak didefinisikan.

# State Management

Tidak ada global state library dan tidak ada React Context.

State dibagi menjadi:

## Local component state

Digunakan untuk:

- Form.
- Dialog.
- Loading dan error lokal.
- Accordion.
- Current question index.
- Selected question/material/user.
- Toast.

## Custom hook state

Digunakan untuk resource CRUD dan data loader.

## `localStorage`

- `authToken`
- `authUser`
- `rsabl_exams`

## `sessionStorage`

- `rsabl-pretest-answers`
- `rsabl-posttest-answers`

Tidak ada mekanisme cache server-state, centralized invalidation, atau cross-tab synchronization.

# Utilities

## `role.js`

Menormalisasi label role menjadi:

- `superadmin`
- `admin`
- `employee`

Label `Karyawan` dipetakan ke `employee`.

## `downloadFile.js`

Membuat object URL dari Blob, membuat anchor sementara, memulai download, lalu mencabut URL.

# Assets

Assets yang berhubungan dengan flow:

- Logo rumah sakit.
- Background landing/login.
- Ikon menu berdasarkan role.
- Ikon pre-test, post-test, dan materi.
- Ikon status lulus/tidak lulus.
- Ikon statistik dan sertifikat.
- Ikon checklist materi.

Assets berfungsi sebagai presentation layer dan tidak memengaruhi kontrak backend.

# Dummy Data dan Hardcode

## Dashboard

Seluruh teks dashboard berada pada `dashboardService`.

## User metadata

Daftar department dan role berada pada `userService`.

## Material

- `DEFAULT_TRAINING_ID = 1`.
- Daftar 10 materi Employee dan status completion dummy.
- `pre_test_completed=false` dan `post_test_unlocked=false`.

## Exam

- Tiga soal komputer.
- Pre-test dummy.
- Post-test dummy.
- Passing grade 75.
- Maksimum post-test attempt 2.
- Penilaian, retry, dan certificate availability dihitung di browser.

## Statistics

Semua metric statistik dummy untuk training ID 1.

## Certificate

- Daftar kosong.
- Message placeholder.
- File download dummy berformat text.

# Clean Architecture Assessment

Project sudah memiliki pemisahan dasar:

- Page sebagai route entry.
- Component untuk tampilan/reuse.
- Hook untuk state dan orchestration.
- Service untuk sumber data.
- Utility untuk fungsi umum.

Namun batas layer belum sepenuhnya konsisten:

- Sebagian page memanggil service langsung, sebagian melalui hook.
- Bentuk respons API belum seragam.
- Dummy logic bisnis berada dalam service frontend.
- `examService` mencampur CRUD administratif, ujian Employee, penilaian, dan browser storage.
- Konteks training belum diteruskan secara konsisten.

# Integrasi dengan Laravel

Strategi integrasi yang paling sesuai dengan struktur saat ini:

1. Pertahankan public API setiap service jika memungkinkan.
2. Ganti body fungsi dummy menjadi request melalui Axios.
3. Lakukan response mapping dalam service.
4. Pertahankan hooks dan reusable components selama kontrak datanya sesuai.
5. Pindahkan seluruh keputusan bisnis sensitif ke Laravel.

Contoh konsep:

```text
Sebelum:
getPostTest() → clone object dummy

Sesudah:
getPostTest(trainingId) → GET Laravel API → map response
```

# Rekomendasi Maintainability

Rekomendasi berikut mencatat arah pengembangan; bukan perubahan yang dilakukan saat ini.

1. Standardisasi response envelope dan penamaan field API.
2. Gunakan role slug teknis yang stabil dan label terpisah untuk UI.
3. Pisahkan service administratif soal dari service attempt Employee.
4. Gunakan training ID eksplisit, bukan constant default.
5. Tambahkan satu sumber konfigurasi route atau endpoint jika jumlah modul bertambah.
6. Konsistenkan error handling agar UI dapat menampilkan validation error backend.
7. Dokumentasikan model payload dan response setiap service.
8. Tambahkan test untuk mapping service, authorization route, dan status flow.
9. Hindari perhitungan nilai atau eligibility di frontend.
10. Pertimbangkan server-state library hanya jika kompleksitas fetching/caching meningkat.

# Panduan Menambahkan Fitur Baru

Urutan yang disarankan:

1. Tentukan role dan route yang menggunakan fitur.
2. Definisikan kontrak data dan status.
3. Tambahkan fungsi service sebagai satu-satunya akses data.
4. Gunakan hook jika fitur memiliki loading, error, mutation, atau lifecycle kompleks.
5. Buat reusable component bila UI digunakan lebih dari satu role/page.
6. Jadikan page sebagai wrapper/orchestrator, bukan tempat seluruh business logic.
7. Tambahkan authorization backend dan frontend.
8. Uji loading, empty, success, validation error, unauthorized, dan server error.

# Cara Developer Baru Memahami Project

1. Baca `AppRouter.jsx` untuk memahami seluruh halaman.
2. Baca `Sidebar.jsx` untuk memahami menu dan hak akses visual.
3. Baca page per role untuk melihat entry flow.
4. Ikuti import menuju reusable component.
5. Baca hook yang digunakan komponen.
6. Baca service untuk menemukan sumber data aktual.
7. Periksa dummy/hardcode sebelum menganggap data berasal dari backend.
8. Gunakan `README_BACKEND_INTEGRATION.md` sebagai referensi kontrak Laravel.
