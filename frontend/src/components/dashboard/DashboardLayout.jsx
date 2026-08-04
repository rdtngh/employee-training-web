import "./DashboardLayout.css";

import { useState } from "react";
import { useLocation } from "react-router-dom";

import Navbar from "../landing/Navbar";
import Sidebar from "./Sidebar";
import Footer from "../common/Footer";

function DashboardLayout({ children, role = "superadmin" }) {
  const location = useLocation();
  const [sidebarState, setSidebarState] = useState({
    isOpen: false,
    pathname: location.pathname,
  });
  const isSidebarOpen = sidebarState.pathname === location.pathname && sidebarState.isOpen;
  const closeSidebar = () => setSidebarState({ isOpen: false, pathname: location.pathname });

  return (
    <div className={`dashboard-layout dashboard-layout-${role}`}>
      <Navbar
        showButton={true}
        buttonText="BERANDA"
        buttonLink="/"
        showMenuButton={true}
        isMenuOpen={isSidebarOpen}
        onMenuToggle={() =>
          setSidebarState({ isOpen: !isSidebarOpen, pathname: location.pathname })
        }
      />

      <div className="dashboard-body">
        <Sidebar
          role={role}
          isOpen={isSidebarOpen}
          onNavigate={closeSidebar}
        />
        <button
          type="button"
          className={`dashboard-sidebar-backdrop${isSidebarOpen ? " is-visible" : ""}`}
          aria-label="Tutup menu navigasi"
          onClick={closeSidebar}
        />

        <main className="dashboard-content">
          <div className="dashboard-content-inner">
            {children}
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}

export default DashboardLayout;
