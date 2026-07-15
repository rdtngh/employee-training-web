# Backend Integration Guide

# Project Overview

Project merupakan frontend Sistem Pelatihan Karyawan RS Advent Bandar Lampung. Frontend menggunakan React, Vite, React Router, dan Axios. Backend target adalah Laravel REST API dengan autentikasi Bearer token.

Kondisi integrasi saat ini:

| Modul | Implementasi aktual |
|---|---|
| Authentication | API |
| User CRUD | API; metadata form hardcode |
| Training | Service API tersedia, belum digunakan halaman |
| Material Admin/Super Admin | API |
| Material Employee | Dummy |
| Question CRUD | `localStorage` |
| Pre-Test/Post-Test | Dummy dan dinilai di frontend |
| Statistics | Dummy |
| Certificate list | Dummy/placeholder |
| Certificate download | API bersyarat environment |

# Struktur Halaman

## Public

| Route | Fungsi |
|---|---|
| `/` | Landing page statis |
| `/login` | Login employee number dan password |

## Employee

| Route | Fungsi |
|---|---|
| `/employee` | Dashboard dan penjelasan flow |
| `/employee/pretest` | Pre-Test dan hasil |
| `/employee/materi` | Daftar materi dan checklist |
| `/employee/posttest` | Post-Test, result, retry, sertifikat |

Frontend juga membuat link `/employee/material/{id}`, tetapi route/page belum tersedia.

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

# Struktur Role

| Role frontend | Slug authorization | Akses utama |
|---|---|---|
| Super Admin | `superadmin` | Semua administrasi dan user |
| Admin | `admin` | Materi, soal, hasil, statistik, sertifikat |
| Karyawan/Employee | `employee` | Flow pelatihan pribadi |

Normalisasi frontend menerima label yang mengandung `super`, `admin`, `employee`, atau `karyawan`. Backend disarankan mengirim slug konsisten agar tidak bergantung pada substring.

# Business Flow

```text
Login
  ↓
Dashboard sesuai role
  ├─ Super Admin → User + Material + Exam + Result
  ├─ Admin       → Material + Exam + Result
  └─ Employee
       ↓
     Pre-Test
       ↓
     Material
       ↓
     Semua material selesai
       ↓
     Post-Test
       ├─ Lulus → Certificate
       └─ Gagal → Retry jika tersedia
```

# Business Rules

## Authentication dan authorization

1. Login menggunakan `employee_number` dan `password`.
2. Backend mengembalikan token dan profil user.
3. Semua endpoint non-public harus dilindungi.
4. Hak akses tidak boleh hanya bergantung pada frontend.
5. Logout harus mencabut token aktif.

## User

1. Hanya Super Admin yang mengelola user.
2. Employee number harus unik.
3. User wajib memiliki department dan role.
4. Frontend mencegah penghapusan user dengan label `Super Admin`; backend wajib menerapkan aturan yang setara.
5. Form frontend tidak menyediakan password, sehingga backend perlu kebijakan initial password atau aktivasi akun.

## Training

1. Material, test, result, progress, dan certificate harus terkait training.
2. Frontend saat ini memakai training ID 1 pada beberapa modul.
3. Service training telah tersedia tetapi belum menjadi sumber konteks halaman.
4. Assignment Employee ke training belum diimplementasikan pada UI.

## Material

1. Materi Employee terkunci sebelum pre-test selesai.
2. Setiap materi memiliki progress per Employee.
3. Post-test hanya terbuka setelah semua materi wajib selesai.
4. Bulk upload mengirim satu judul untuk setiap file.
5. Jumlah `titles[]` dan `files[]` harus sama.

## Exam

1. Setiap question memiliki empat opsi A–D.
2. Setiap question memiliki tepat satu correct answer.
3. Correct answer hanya boleh dikirim pada endpoint administratif.
4. Endpoint Employee tidak boleh mengekspos correct answer.
5. Passing grade berasal dari konfigurasi test/backend.
6. Nilai, kelulusan, attempt, retry, dan sertifikat ditentukan backend.

## Post-Test dan retry

1. Post-test dikunci jika `materials_completed=false`.
2. Retry hanya tersedia jika hasil gagal dan attempt belum mencapai maksimum.
3. Attempt berikutnya harus dibuat backend secara atomik.
4. Frontend menggunakan `attempt`, `max_attempt`, dan `can_retry`.

## Certificate

1. Sertifikat tersedia hanya setelah Employee lulus Post-Test.
2. Frontend membaca `certificate_available`.
3. File download diharapkan berupa Blob, idealnya PDF.

# Entity Sistem

## User

Field yang ditunjukkan frontend:

- `id`
- `employee_number`
- `name`
- `department`
- `role`
- password untuk autentikasi, walaupun tidak ditampilkan pada user form

## Role

- Super Admin
- Admin
- Employee/Karyawan

## Department

Frontend menggunakan IT, HRD, Keuangan, Pelayanan, dan Manajemen sebagai opsi hardcode.

## Training

Field yang ditemukan:

- `id`
- `title`
- keterkaitan ke test dan material

## Training Assignment/Enrollment

Entity ini belum tampil eksplisit, tetapi kebutuhan assignment muncul dari hubungan Employee dan training. Karena frontend belum menyediakan implementasinya, detail status assignment belum dapat ditentukan dari source.

## Material

- `id`
- `training_id`
- `title`
- `description`
- `speaker`
- `order_number`
- `files`

## Material File

- `file_name`
- `file_type`
- `file_path`

## Material Progress

- Employee/user
- Material
- `completed`

## Test/Exam

- `id`
- `training_id`
- `type`: ditemukan `pre_test`; post-test direpresentasikan terpisah
- `passing_grade`

## Question

- `id`
- `question`
- `options.a` sampai `options.d`
- `correctAnswer` pada sisi administratif

## Exam Attempt/Result

- test/user/training
- `status`
- `attempt`
- `max_attempt`
- `score`
- `correct` atau `correct_answers`
- `wrong` atau `wrong_answers`
- `percentage`
- `passed`
- `can_retry`

## Exam Answer

- `question_id`
- `answer`
- hubungan ke attempt

## Certificate

Frontend membuktikan hubungan certificate dengan training dan kelulusan Employee. Field administratif detail belum diimplementasikan.

## Statistics

Statistics merupakan agregasi result, bukan harus menjadi tabel tersendiri. Field agregat yang dibutuhkan:

- average score
- participant count
- passed count
- failed count
- highest score
- lowest score
- pass percentage

## Hubungan Entity

```text
Role 1 ── * User
Department 1 ── * User

User * ── * Training
Training 1 ── * Material
Material 1 ── * MaterialFile
User * ── * Material melalui MaterialProgress

Training 1 ── * Test
Test 1 ── * Question
Question 1 ── * Option

User 1 ── * ExamAttempt
Test 1 ── * ExamAttempt
ExamAttempt 1 ── * ExamAnswer
ExamAttempt 1 ── 0..1 Certificate
```

# Analisis Folder Services

## `authService`

Digunakan oleh LoginCard, ProtectedRoute, dan Sidebar.

| Fungsi | Kebutuhan |
|---|---|
| `login` | POST employee number dan password |
| `storeSession` | Menyimpan token/user lokal |
| `getStoredToken` | Membaca token |
| `getStoredUser` | Membaca profil lokal |
| `logout` | POST logout lalu hapus sesi |
| `getCurrentUser` | GET `/me` |

Login mengharapkan respons top-level `{ token, user }`.

## `dashboardService`

Digunakan ketiga dashboard role. Seluruh data berupa teks statis:

- `title`
- `description`
- `sectionTitle`
- `items`
- `footer`
- `closing` untuk Employee

Backend tidak wajib menggantinya kecuali dashboard akan menampilkan informasi dinamis.

## `materialService`

Digunakan Kelola Materi Admin/Super Admin dan Materi Employee.

Fungsi:

- `getAllMaterials`
- `getMaterials`
- `createMaterial`
- `createMaterialsBulk`
- `updateMaterial`
- `deleteMaterial`

Admin API sudah menggunakan multipart. Employee response masih dummy.

## `trainingService`

Menyediakan:

- `getTrainings`
- `getTraining(id)`

Belum digunakan halaman.

## `examService`

Digunakan Kelola Ujian, Pre-Test, dan Post-Test.

Fungsi administratif:

- get/create/update/delete question.

Fungsi Employee:

- get/submit Pre-Test.
- get/submit Post-Test.
- get result.
- retry Post-Test.

Semua fungsi tersebut masih lokal/dummy.

## `certificateService`

- `getCertificates`: placeholder list kosong.
- `downloadCertificate(trainingId)`: dummy secara default; API jika dummy dinonaktifkan.

## `statisticsService`

- `getStatistics(role)`: dummy.
- `exportStatistics(format)`: Blob teks dummy.

## `userService`

Digunakan hanya Super Admin User Management.

- GET users.
- POST user.
- PUT user.
- DELETE user.
- Metadata department/role hardcode.

Terdapat perbedaan penamaan request dan response mapper:

| Request | Response yang dibaca mapper |
|---|---|
| `name` | `user` |
| `employee_number` | `userId` |

# Dummy Data

| File | Struktur/tujuan | Endpoint pengganti |
|---|---|---|
| `dashboardService.js` | Konten dashboard per role | Opsional `/dashboard` |
| `userService.js` | Departments dan roles | `/departments`, `/roles` atau metadata gabungan |
| `materialService.js` | Training dan 10 materi Employee dengan completion | `/employee/trainings/{id}/materials` |
| `materialService.js` | Default training ID 1 | Training aktif atau parameter route/query |
| `examService.js` | Tiga questions dan correct answers | Endpoint question/test |
| `examService.js` | Pre-Test dan result calculation | Endpoint pre-test + submit |
| `examService.js` | Post-Test status, attempt, retry, result | Endpoint post-test + retry |
| `statisticsService.js` | Seluruh metric statistik | Endpoint statistics |
| `statisticsService.js` | File export dummy | Endpoint export binary |
| `certificateService.js` | List kosong dan message | Endpoint certificates |
| `certificateService.js` | File text dummy | Endpoint PDF download |

# Data yang Dibutuhkan Setiap Halaman

## Landing Page

Tidak membutuhkan backend berdasarkan implementasi sekarang.

## Login

Input:

- `employee_number`
- `password`

Response:

- `token`
- user `id`
- user `employee_number`
- user `name`
- user `role`

## Dashboard Employee

Implementasi sekarang hanya membutuhkan konten dashboard statis. Belum ada field nama atau progress yang dirender.

Untuk flow lintas halaman, frontend lain membutuhkan:

- training aktif
- `pre_test_completed`
- progress material
- `materials_completed`
- post-test status
- certificate availability

## Dashboard Admin/Super Admin

Saat ini hanya konten statis. Tidak ada counter atau statistik yang diminta dashboard.

## User Management

- `id`
- `user`/`name`
- `userId`/`employee_number`
- `department`
- `role`
- daftar department
- daftar role

## Manage Material

- `id`
- `title`
- `description`
- `speaker`
- `order_number`
- `files[].file_name`
- `files[].file_type`
- `files[].file_path`

Payload single:

- `title`
- `training_id`
- `description`, opsional
- `files[]`

Payload bulk:

- `training_id`
- `titles[]`
- `files[]`

## Employee Materials

```json
{
  "training": {
    "id": 1,
    "title": "Judul Training",
    "pre_test_completed": true,
    "post_test_unlocked": false
  },
  "materials": [
    {
      "id": 1,
      "title": "Materi 1",
      "completed": true
    }
  ]
}
```

## Manage Exam

- question `id`
- `question`
- `options.a`
- `options.b`
- `options.c`
- `options.d`
- `correctAnswer`

UI belum meminta test ID, training ID, type, atau order number.

## Employee Pre-Test

```json
{
  "test": {
    "id": 1,
    "training_id": 1,
    "type": "pre_test",
    "passing_grade": 75
  },
  "questions": [
    {
      "id": 1,
      "question": "Pertanyaan",
      "options": {
        "a": "A",
        "b": "B",
        "c": "C",
        "d": "D"
      }
    }
  ]
}
```

Result:

- `score`
- `correct_answers`
- `wrong_answers`
- `percentage`
- `passed`
- `passing_grade`

## Employee Post-Test

- training `id`, `title`
- `materials_completed`
- post-test `id`
- `status`
- `attempt`
- `max_attempt`
- `can_retry`
- `certificate_available`
- `passing_grade`
- `score`
- `correct`
- `wrong`
- `percentage`
- `passed`
- questions tanpa correct answer

## Exam Result Menu

Halaman induk tidak memuat data result; hanya menyediakan navigasi dan export.

## Statistics

- `title`
- training `id`, `title`
- `average_score`
- `participant_count`
- `passed_count`
- `failed_count`
- `highest_score`
- `lowest_score`
- `pass_percentage`

## Certificate Admin/Super Admin

Implementasi sekarang hanya merender:

- `title`
- `message`

Field daftar certificate belum digunakan UI.

# Status yang Digunakan

| Status/field | Arti pada frontend |
|---|---|
| `NOT_STARTED` | Post-Test belum dimulai atau telah di-reset untuk retry |
| `PASSED` | Post-Test lulus |
| `FAILED` | Post-Test tidak lulus |
| `passed` | Boolean kelulusan result |
| `pre_test_completed` | Pre-Test telah selesai sehingga materi dapat dibuka |
| `completed` | Satu materi telah selesai |
| `materials_completed` | Semua materi telah selesai sehingga Post-Test terbuka |
| `post_test_unlocked` | Status unlock pada dummy training; belum dipakai halaman |
| `can_retry` | Employee boleh melakukan attempt berikutnya |
| `certificate_available` | Tombol download certificate dapat ditampilkan |
| `attempt` | Nomor attempt saat ini |
| `max_attempt` | Batas attempt |

Frontend belum menggunakan status `IN_PROGRESS`, `SUBMITTED`, atau `post_test_completed`.

# Endpoint Recommendation

## Authentication

| Method | Endpoint | Tujuan |
|---|---|---|
| POST | `/api/login` | Login |
| POST | `/api/logout` | Revoke token |
| GET | `/api/me` | Profil login |

## User

| Method | Endpoint | Tujuan |
|---|---|---|
| GET | `/api/users` | Daftar user |
| POST | `/api/users` | Tambah user |
| GET | `/api/users/{id}` | Detail user |
| PUT | `/api/users/{id}` | Edit user |
| DELETE | `/api/users/{id}` | Hapus user |
| GET | `/api/user-form-options` | Department dan role |

## Training

| Method | Endpoint | Tujuan |
|---|---|---|
| GET | `/api/trainings` | Daftar training |
| GET | `/api/trainings/{id}` | Detail training |
| GET | `/api/employee/trainings/active` | Training aktif Employee |
| GET | `/api/employee/trainings/{id}/progress` | Progress agregat |

CRUD training belum memiliki UI, sehingga POST/PUT/DELETE tidak berasal dari kebutuhan halaman saat ini.

## Material

| Method | Endpoint | Tujuan |
|---|---|---|
| GET | `/api/trainings/{training}/materials` | Daftar materi administratif |
| POST | `/api/materials` | Upload single |
| POST | `/api/materials/bulk` | Upload bulk |
| GET | `/api/materials/{id}` | Detail materi |
| POST + `_method=PUT` | `/api/materials/{id}` | Update multipart sesuai frontend |
| DELETE | `/api/materials/{id}` | Hapus materi |
| GET | `/api/employee/trainings/{training}/materials` | Materi + progress Employee |
| GET | `/api/employee/materials/{id}` | Detail materi Employee |
| POST | `/api/employee/materials/{id}/complete` | Menandai completion |

## Exam dan Question

| Method | Endpoint | Tujuan |
|---|---|---|
| GET | `/api/trainings/{training}/tests` | Daftar test |
| GET | `/api/tests/{test}/questions` | Daftar question administratif |
| POST | `/api/tests/{test}/questions` | Tambah question |
| PUT | `/api/questions/{question}` | Edit question |
| DELETE | `/api/questions/{question}` | Hapus question |

## Pre-Test Employee

| Method | Endpoint | Tujuan |
|---|---|---|
| GET | `/api/employee/trainings/{training}/pre-test` | Soal atau result existing |
| POST | `/api/employee/pre-test/start` | Membuat attempt |
| POST | `/api/employee/pre-test/submit` | Submit jawaban |
| GET | `/api/employee/trainings/{training}/pre-test/result` | Hasil terakhir |

## Post-Test Employee

| Method | Endpoint | Tujuan |
|---|---|---|
| GET | `/api/employee/trainings/{training}/post-test` | Status, question, result |
| POST | `/api/employee/post-test/start` | Membuat attempt |
| POST | `/api/employee/post-test/submit` | Submit jawaban |
| POST | `/api/employee/trainings/{training}/post-test/retry` | Attempt berikutnya |
| GET | `/api/employee/trainings/{training}/post-test/result` | Hasil terakhir |

## Result

| Method | Endpoint | Tujuan |
|---|---|---|
| GET | `/api/trainings/{training}/results` | Daftar hasil peserta |
| GET | `/api/trainings/{training}/results/{user}` | Detail hasil peserta |

UI daftar result belum tersedia; endpoint ini adalah kebutuhan yang tersirat dari menu Hasil Ujian, bukan kontrak service yang sudah aktif.

## Certificate

| Method | Endpoint | Tujuan |
|---|---|---|
| GET | `/api/certificates` | Daftar certificate administratif |
| GET | `/api/certificates/{id}` | Detail certificate |
| GET | `/api/certificates/{training}/download` | Download milik Employee sesuai service saat ini |

## Statistics

| Method | Endpoint | Tujuan |
|---|---|---|
| GET | `/api/trainings/{training}/statistics` | Metric statistik |
| GET | `/api/trainings/{training}/statistics/export?format=spss` | Export statistik |

## Dashboard

Tidak ada endpoint wajib berdasarkan implementasi saat ini. Jika konten dibuat dinamis, endpoint dapat dikelompokkan berdasarkan role.

# Backend Validation

## Login

- Employee number dan password wajib.
- Kredensial harus valid.
- Akun harus aktif.
- Rate limiting direkomendasikan.

## User

- Employee number unik.
- Name wajib.
- Department valid.
- Role valid.
- Hanya Super Admin yang boleh CRUD user.
- Penghapusan Super Admin harus ditolak sesuai rule frontend.

## Material

- Training harus valid.
- Judul wajib.
- File wajib pada create.
- MIME type dan size harus dibatasi.
- Pada bulk, jumlah title dan file harus sama.
- File lama harus ditangani aman saat update/delete.

## Exam dan Question

- Test/training harus valid.
- Question wajib.
- Opsi A–D wajib dan tidak kosong.
- Correct answer harus salah satu A–D.
- Endpoint Employee tidak mengirim correct answer.

## Progress Materi

- Employee harus terdaftar pada training.
- Pre-Test harus selesai sebelum materi dapat dicatat.
- Employee hanya dapat mengubah progress miliknya.
- Backend menghitung `materials_completed`, bukan menerima klaim dari client.

## Submission Ujian

- Attempt milik user yang login.
- Attempt belum submitted.
- Question termasuk test terkait.
- Setiap question dijawab maksimal sekali.
- Nilai dihitung backend.
- Submission sebaiknya menggunakan transaction.

## Re-Attempt

- Hasil terakhir gagal.
- `attempt < max_attempt`.
- Tidak ada attempt aktif lain.
- Counter attempt dinaikkan secara atomik.

## Certificate

- Post-Test harus lulus.
- Certificate tidak digandakan untuk training/user yang sama tanpa rule eksplisit.
- Employee hanya dapat mengunduh certificate miliknya.
- Admin/Super Admin mengikuti policy yang sesuai.

## Statistics

- Hanya Admin/Super Admin.
- Agregasi berdasarkan result tersimpan, bukan nilai dari client.
- Training/filter harus valid.

## Assignment Pelatihan

Frontend belum menyediakan UI assignment. Backend perlu menunggu keputusan produk untuk aturan assignment, active training, periode, dan multiple concurrent training.

# Integration Notes

## Response format

Frontend membaca beberapa bentuk berbeda:

- `response.data`
- `response.data.data`
- `response.data.user`

Format yang direkomendasikan:

```json
{
  "success": true,
  "message": "Operasi berhasil.",
  "data": {}
}
```

Login merupakan pengecualian aktual karena langsung membaca `{ token, user }`.

## Error format

```json
{
  "message": "Data tidak valid.",
  "errors": {
    "employee_number": ["Nomor pegawai sudah digunakan."]
  }
}
```

## Authentication

- Gunakan Bearer token, misalnya Laravel Sanctum.
- Status `401` sesuai interceptor frontend.
- Gunakan status `403` untuk role yang tidak berhak.

## Multipart

Frontend membiarkan browser menentukan multipart boundary. Backend harus menerima:

- `files[]`
- `titles[]`
- `_method=PUT` untuk update materi

## File URL

Frontend mengubah path relatif file materi menjadi URL berdasarkan origin API. Backend dapat mengirim URL absolut atau path yang dapat diakses dari origin backend.

## Download

Endpoint download perlu mengirim:

```http
Content-Type: application/pdf
Content-Disposition: attachment; filename="sertifikat.pdf"
```

# Potential Issues

1. **Authentication route dapat dilewati** jika `VITE_REQUIRE_AUTH` tidak bernilai `true`.
2. **Mapping user tidak konsisten** antara `name/employee_number` dan `user/userId`.
3. **Role tidak seragam** antara label Indonesia dan slug teknis.
4. **Form create user tidak mengirim password**.
5. **Training ID di-hardcode menjadi 1** pada material dan berbagai dummy.
6. **`trainingService` belum dipakai** untuk menentukan konteks training.
7. **Kelola soal tidak memiliki training/test type** pada payload UI.
8. **Question CRUD masih `localStorage`**, sehingga berbeda per browser.
9. **Correct answer dan scoring berada di frontend** pada dummy test.
10. **Pre-Test dan Post-Test memakai sumber soal dummy yang sama**.
11. **Route detail materi Employee tidak ada**, walaupun link telah dibuat.
12. **Aksi completion/checklist materi belum ada**.
13. **`post_test_unlocked` tidak digunakan**, sedangkan halaman memakai `materials_completed`.
14. **Halaman result belum menampilkan daftar peserta**.
15. **Halaman certificate Admin/Super Admin hanya placeholder**.
16. **Statistics tidak menerima training/filter** dari halaman.
17. **Export SPSS belum menerima konteks filter** dan masih file text dummy.
18. **Pagination, search, dan filter belum diimplementasikan** pada daftar administratif.
19. **Error handling service tidak seragam**; sebagian mutation hanya mengembalikan boolean.
20. **Attempt start belum dicatat backend**; jawaban sementara hanya ada di session browser.

# Rekomendasi Urutan Implementasi Backend

1. Authentication, token, role, dan policy.
2. User dan metadata department/role.
3. Training dan assignment/active training setelah requirement disepakati.
4. Material dan file storage.
5. Material progress Employee.
6. Test, question, dan option.
7. Pre-Test attempt dan submission.
8. Post-Test attempt, submission, dan retry.
9. Result aggregation dan statistics.
10. Certificate generation dan download.

# Kesimpulan

Frontend telah memiliki pemisahan service, hooks, page, dan reusable component yang cukup untuk menjadi dasar integrasi Laravel. Modul autentikasi dan material administratif paling dekat dengan kontrak API nyata.

Frontend belum dapat dianggap siap sepenuhnya untuk backend karena flow inti Employee masih dummy: progress materi, penilaian ujian, attempt, retry, statistik, dan sertifikat. Selain membangun endpoint, tim perlu menyepakati konteks training, kontrak user/role, pemisahan pre-test/post-test, mekanisme assignment, dan halaman detail materi.

Backend harus menjadi sumber kebenaran untuk seluruh status dan business rule. Frontend sebaiknya hanya menampilkan data, mengumpulkan input, dan memanggil service sesuai eligibility yang dikirim backend.
