import DashboardLayout from "../../components/dashboard/DashboardLayout";
import * as dashboardService from "../../services/dashboardService";
import { useServiceData } from "../../hooks/useServiceData";
import "./DashboardAdmin.css";

import welcomeIcon from "../../assets/icons/icon-welcomeadmin.svg";
import taskIcon from "../../assets/icons/icon-tugasdashboard.svg";

function DashboardAdmin() {
  const { data: dashboard } = useServiceData(
    dashboardService.getDashboard,
    "admin",
    null
  );

  return (
    <DashboardLayout role="admin">
      {dashboard && (
      <section className="dashboard-admin-card">
        <div className="dashboard-admin-header">
          <img
            src={welcomeIcon}
            alt=""
            className="dashboard-admin-icon"
          />

          <h1 className="dashboard-admin-title">
            {dashboard.title}
          </h1>
        </div>

        <p className="dashboard-admin-copy">
          {dashboard.description}
        </p>

        <div className="dashboard-admin-section">
          <img
            src={taskIcon}
            alt=""
            className="dashboard-admin-section-icon"
          />

          <div className="dashboard-admin-section-content">
            <h2 className="dashboard-admin-section-title">{dashboard.sectionTitle}</h2>

            <ul className="dashboard-admin-list">
              {dashboard.items.map((item) => (
                <li key={item.id}>{item.text}</li>
              ))}
            </ul>
          </div>
        </div>

        <hr className="dashboard-admin-divider" />

        <p className="dashboard-admin-footer">
          {dashboard.footer}
        </p>
      </section>
      )}
    </DashboardLayout>
  );
}

export default DashboardAdmin;
