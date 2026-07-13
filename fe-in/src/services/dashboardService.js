const dashboardByRole = {
  employee: {
    title: "Selamat Datang!",
    description:
      "Selamat Datang di Sistem Pelatihan Karyawan RS Advent Bandar Lampung",
    sectionTitle: "Alur Pelatihan",
    items: [
      { id: 1, text: "Kerjakan Pre-Test untuk mengukur kemampuan awal." },
      { id: 2, text: "Pelajari seluruh materi pelatihan yang tersedia." },
      { id: 3, text: "Selesaikan Post-Test sebagai evaluasi akhir." },
      { id: 4, text: "Lihat hasil pembelajaran setelah seluruh tahapan selesai." },
    ],
    footer:
      "Platform ini dirancang untuk mendukung proses pembelajaran dan pengembangan kompetensi seluruh karyawan melalui materi pelatihan, pre-test, dan post-test yang terstruktur.",
  },
  admin: {
    title: "Selamat Datang,\nAdmin!",
    description:
      "Selamat datang di Sistem Pelatihan Karyawan RS Advent Bandar Lampung. Gunakan dashboard ini untuk mengelola materi pelatihan, soal ujian, dan memantau proses pelatihan sesuai dengan hak akses yang diberikan.",
    sectionTitle: "Tanggung Jawab Utama:",
    items: [
      { id: 1, text: "Mengelola materi pelatihan." },
      { id: 2, text: "Mengelola soal pre-test dan post-test." },
      { id: 3, text: "Memantau hasil pelatihan peserta." },
      { id: 4, text: "Memastikan materi dan soal selalu diperbarui." },
    ],
    footer:
      "Pengelolaan materi dan evaluasi yang baik membantu menciptakan proses pelatihan yang efektif serta mendukung peningkatan kompetensi karyawan.",
  },
  superadmin: {
    title: "Selamat Datang,\nSuper Admin!",
    description:
      "Selamat datang di Sistem Pelatihan Karyawan RS Advent Bandar Lampung. Dashboard ini menyediakan akses penuh untuk mengelola pengguna, materi pelatihan, soal ujian, serta memantau pelaksanaan pelatihan secara menyeluruh.",
    sectionTitle: "Tanggung Jawab Utama:",
    items: [
      { id: 1, text: "Mengelola data pengguna." },
      { id: 2, text: "Mengelola materi pelatihan." },
      { id: 3, text: "Mengelola soal pre-test dan post-test." },
      { id: 4, text: "Memantau hasil pelatihan karyawan." },
      { id: 5, text: "Mengelola hak akses pengguna." },
    ],
    footer:
      "Pastikan seluruh data pelatihan selalu diperbarui agar proses pembelajaran berjalan efektif dan mendukung peningkatan kualitas pelayanan di RS Advent Bandar Lampung.",
  },
};

const clone = (data) => JSON.parse(JSON.stringify(data));

export const getDashboard = async (role) =>
  clone(dashboardByRole[role] ?? dashboardByRole.employee);
