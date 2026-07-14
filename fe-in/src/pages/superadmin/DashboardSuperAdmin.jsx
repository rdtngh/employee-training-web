import DashboardLayout from "../../components/dashboard/DashboardLayout";
import * as dashboardService from "../../services/dashboardService";
import { useServiceData } from "../../hooks/useServiceData";
import "./DashboardSuperAdmin.css";
import welcomeIcon from "../../assets/icons/icon-welcomesuperadmin.svg";
import taskIcon from "../../assets/icons/icon-tugasdashboard.svg";

function DashboardSuperAdmin() {
  const { data: dashboard } = useServiceData(
    dashboardService.getDashboard,
    "superadmin",
    null
  );

  return (
    <DashboardLayout role="superadmin">
      {dashboard && (
      <section className="dashboard-superadmin-card">
        <div className="dashboard-superadmin-header">
          <img src={welcomeIcon} alt="" className="dashboard-superadmin-icon" />
          <h1 className="dashboard-superadmin-title">
            {dashboard.title}
          </h1>
        </div>

        <p className="dashboard-superadmin-copy">
          {dashboard.description}
        </p>

        <div className="dashboard-superadmin-section">
          <div className="dashboard-superadmin-section-header">
            <img src={taskIcon} alt="" className="dashboard-superadmin-section-icon" />
            <h2 className="dashboard-superadmin-section-title">{dashboard.sectionTitle}</h2>
          </div>

          <ul className="dashboard-superadmin-list">
            {dashboard.items.map((item) => (
              <li key={item.id}>{item.text}</li>
            ))}
          </ul>
        </div>

        <hr className="dashboard-superadmin-divider" />

        <p className="dashboard-superadmin-footer">
          {dashboard.footer}
        </p>
      </section>
      )}
    </DashboardLayout>
  );
}

export default DashboardSuperAdmin;
