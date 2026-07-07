import DashboardLayout from "../../components/dashboard/DashboardLayout";
import "./DashboardSuperAdmin.css";
import welcomeIcon from "../../assets/icons/icon-welcomesuperadmin.svg";
import taskIcon from "../../assets/icons/icon-tugasdashboard.svg";

function DashboardSuperAdmin() {
  return (
    <DashboardLayout role="superadmin">
      <section className="dashboard-superadmin-card">
        <div className="dashboard-superadmin-header">
          <img src={welcomeIcon} alt="" className="dashboard-superadmin-icon" />
          <h1 className="dashboard-superadmin-title">
            Selamat Datang,
            <br />
            Super Admin!
          </h1>
        </div>

        <p className="dashboard-superadmin-copy">
          Selamat datang di Sistem Pelatihan Karyawan RS Advent Bandar Lampung.
          Dashboard ini menyediakan akses penuh untuk mengelola pengguna, materi
          pelatihan, soal ujian, serta memantau pelaksanaan pelatihan secara
          menyeluruh.
        </p>

        <div className="dashboard-superadmin-section">
          <img src={taskIcon} alt="" className="dashboard-superadmin-section-icon" />
          <div className="dashboard-superadmin-section-content">
            <h2 className="dashboard-superadmin-section-title">Tanggung Jawab Utama:</h2>
            <ul className="dashboard-superadmin-list">
              <li>Mengelola data pengguna.</li>
              <li>Mengelola materi pelatihan.</li>
              <li>Mengelola soal pre-test dan post-test.</li>
              <li>Memantau hasil pelatihan karyawan.</li>
              <li>Mengelola hak akses pengguna.</li>
            </ul>
          </div>
        </div>

        <hr className="dashboard-superadmin-divider" />

        <p className="dashboard-superadmin-footer">
          Pastikan seluruh data pelatihan selalu diperbarui agar proses
          pembelajaran berjalan efektif dan mendukung peningkatan kualitas
          pelayanan di RS Advent Bandar Lampung.
        </p>
      </section>
    </DashboardLayout>
  );
}

export default DashboardSuperAdmin;
