import DashboardLayout from "../../components/dashboard/DashboardLayout";
import "./DashboardAdmin.css";

import welcomeIcon from "../../assets/icons/icon-welcomeadmin.svg";
import taskIcon from "../../assets/icons/icon-tugasdashboard.svg";

function DashboardAdmin() {
  return (
    <DashboardLayout role="admin">
      <section className="dashboard-admin-card">
        <div className="dashboard-admin-header">
          <img
            src={welcomeIcon}
            alt=""
            className="dashboard-admin-icon"
          />

          <h1 className="dashboard-admin-title">
            Selamat Datang,
            <br />
            Admin!
          </h1>
        </div>

        <p className="dashboard-admin-copy">
          Selamat datang di Sistem Pelatihan Karyawan RS Advent Bandar Lampung.
          Gunakan dashboard ini untuk mengelola materi pelatihan, soal ujian,
          dan memantau proses pelatihan sesuai dengan hak akses yang diberikan.
        </p>

        <div className="dashboard-admin-section">
          <img
            src={taskIcon}
            alt=""
            className="dashboard-admin-section-icon"
          />

          <div className="dashboard-admin-section-content">
            <h2 className="dashboard-admin-section-title">Tanggung Jawab Utama:</h2>

            <ul className="dashboard-admin-list">
              <li>Mengelola materi pelatihan.</li>
              <li>Mengelola soal pre-test dan post-test.</li>
              <li>Memantau hasil pelatihan peserta.</li>
              <li>Memastikan materi dan soal selalu diperbarui.</li>
            </ul>
          </div>
        </div>

        <hr className="dashboard-admin-divider" />

        <p className="dashboard-admin-footer">
          Pengelolaan materi dan evaluasi yang baik membantu menciptakan proses
          pelatihan yang efektif serta mendukung peningkatan kompetensi karyawan.
        </p>
      </section>
    </DashboardLayout>
  );
}

export default DashboardAdmin;