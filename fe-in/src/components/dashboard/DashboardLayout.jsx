import "./DashboardLayout.css";

import Navbar from "../landing/Navbar";
import Sidebar from "./Sidebar";

function DashboardLayout({ children, role = "superadmin" }) {
  return (
    <div className="dashboard-layout">
      <Navbar
        showButton={true}
        buttonText="BERANDA"
        buttonLink="/"
      />

      <div className="dashboard-body">
        <Sidebar role={role} />

        <main className="dashboard-content">
          <div className="dashboard-content-inner">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
