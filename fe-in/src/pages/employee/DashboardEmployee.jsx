import DashboardLayout from "../../components/dashboard/DashboardLayout";
import * as dashboardService from "../../services/dashboardService";
import { useServiceData } from "../../hooks/useServiceData";
import "./DashboardEmployee.css";
import welcomeIcon from "../../assets/icons/icon-welcomekaryawan.svg";
import flowIcon from "../../assets/icons/icon-alurpelatihan.svg";

function DashboardEmployee() {
  const { data: dashboard } = useServiceData(
    dashboardService.getDashboard,
    "employee",
    null
  );

  return (
    <DashboardLayout role="employee">
      {dashboard && (
      <section className="dashboard-employee-card">
        <div className="dashboard-employee-header">
          <img src={welcomeIcon} alt="Welcome" className="dashboard-employee-icon" />
          <h1 className="dashboard-employee-title">{dashboard.title}</h1>
        </div>

        <p className="dashboard-employee-copy">
          {dashboard.description}
        </p>

        <p className="dashboard-employee-footer">
          {dashboard.footer}
        </p>

        <div className="dashboard-employee-section">
          <div className="dashboard-employee-section-header">
            <img src={flowIcon} alt="" className="dashboard-employee-section-icon" />
            <h2 className="dashboard-employee-section-title">{dashboard.sectionTitle}</h2>
          </div>

          <ul className="dashboard-employee-list">
            {dashboard.items.map((item) => (
              <li key={item.id}>{item.text}</li>
            ))}
          </ul>
        </div>

        <hr className="dashboard-employee-divider" />

        <p className="dashboard-employee-closing">
          {dashboard.closing}
        </p>
      </section>
      )}
    </DashboardLayout>
  );
}

export default DashboardEmployee;
