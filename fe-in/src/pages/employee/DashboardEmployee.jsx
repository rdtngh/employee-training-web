import DashboardLayout from "../../components/dashboard/DashboardLayout";
import "./DashboardEmployee.css";
import welcomeIcon from "../../assets/icons/icon-welcomekaryawan.svg";
import flowIcon from "../../assets/icons/icon-alurpelatihan.svg";

function DashboardEmployee() {
  return (
    <DashboardLayout role="employee">
      <section className="dashboard-employee-card">
        <div className="dashboard-employee-header">
          <img src={welcomeIcon} alt="Welcome" className="dashboard-employee-icon" />
          <h1 className="dashboard-employee-title">Selamat Datang!</h1>
        </div>

        <p className="dashboard-employee-copy">
          Selamat Datang di Sistem Pelatihan Karyawan RS Advent Bandar Lampung
        </p>

        <p className="dashboard-employee-footer">
          Platform ini dirancang untuk mendukung proses pembelajaran dan
          pengembangan kompetensi seluruh karyawan melalui materi pelatihan,
          pre-test, dan post-test yang terstruktur.
        </p>

        <div className="dashboard-employee-section">
          <img src={flowIcon} alt="Alur Pelatihan" className="dashboard-employee-section-icon" />
          <div className="dashboard-employee-section-content">
            <div className="dashboard-employee-section-header">
              <h2 className="dashboard-employee-section-title">Alur Pelatihan</h2>
            </div>

            <ul className="dashboard-employee-list">
              <li>Kerjakan Pre-Test untuk mengukur kemampuan awal.</li>
              <li>Pelajari seluruh materi pelatihan yang tersedia.</li>
              <li>Selesaikan Post-Test sebagai evaluasi akhir.</li>
              <li>Lihat hasil pembelajaran setelah seluruh tahapan selesai.</li>
            </ul>
          </div>
        </div>

        <hr className="dashboard-employee-divider" />
      </section>
    </DashboardLayout>
  );
}

export default DashboardEmployee;
