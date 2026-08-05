import { NavLink, useLocation } from "react-router-dom";
import { useState } from "react";
import * as authService from "../../services/authService";
import "./Sidebar.css";

import iconHome from "../../assets/icons/icon-berandaputih.svg";
import iconHomeActive from "../../assets/icons/icon-berandahitam.svg";
import iconUsers from "../../assets/icons/icon-kelolapenggunaputih.svg";
import iconUsersActive from "../../assets/icons/icon-kelolapenggunahitam.svg";
import iconMateri from "../../assets/icons/icon-kelola-materi.svg";
import iconExam from "../../assets/icons/icon-kelolaujianputih.svg";
import iconExamActive from "../../assets/icons/icon-kelolaujianhitam.svg";
import iconLogout from "../../assets/icons/icon-logout.svg";
import iconPreTest from "../../assets/icons/icon-kelolaujianputih.svg";
import iconPostTest from "../../assets/icons/icon-posttest.svg";
import iconMaterial from "../../assets/icons/icon-kelola-materi.svg";
import iconCertificate from "../../assets/icons/icon-sertifikat.svg";

const menuByRole = {
  superadmin: [
    {
      id: "superadmin-dashboard",
      label: "Dashboard",
      to: "/superadmin",
      icon: iconHome,
      activeIcon: iconHomeActive,
    },
    {
      id: "superadmin-users",
      label: "Kelola Pengguna",
      to: "/superadmin/manage-user",
      icon: iconUsers,
      activeIcon: iconUsersActive,
    },
    { id: "superadmin-materials", label: "Kelola Materi", to: "/superadmin/manage-materi", icon: iconMateri },
    {
      id: "superadmin-exams",
      label: "Kelola Ujian",
      to: "/superadmin/manage-exam",
      icon: iconExam,
      activeIcon: iconExamActive,
      children: [
        { id: "superadmin-exam-results", label: "Hasil Ujian", to: "/superadmin/exam-results" },
      ],
    },
  ],
  admin: [
    {
      id: "admin-dashboard",
      label: "Dashboard",
      to: "/admin",
      icon: iconHome,
      activeIcon: iconHomeActive,
    },
    { id: "admin-materials", label: "Kelola Materi", to: "/admin/manage-materi", icon: iconMateri },
    {
      id: "admin-exams",
      label: "Kelola Ujian",
      to: "/admin/manage-exam",
      icon: iconExam,
      activeIcon: iconExamActive,
      children: [
        { id: "admin-exam-results", label: "Hasil Ujian", to: "/admin/exam-results" },
      ],
    },
  ],
  employee: [
    {
      id: "employee-dashboard",
      label: "Dashboard",
      to: "/employee",
      icon: iconHome,
      activeIcon: iconHomeActive,
    },
    { id: "employee-materials", label: "Materi", to: "/employee/materi", icon: iconMaterial },
    {
      id: "employee-pretest",
      label: "Pre-Test",
      to: "/employee/pretest",
      icon: iconPreTest,
      activeIcon: iconExamActive,
    },
    { id: "employee-posttest", label: "Post-Test", to: "/employee/posttest", icon: iconPostTest },
    { id: "employee-history", label: "Riwayat Pelatihan", to: "/employee/history", icon: iconCertificate },
  ],
};

function Sidebar({ role = "superadmin", isOpen = false, onNavigate }) {
  const menu = menuByRole[role] || menuByRole.superadmin;
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState({});

  const isBaseMenu = (item) =>
    item.to === "/superadmin" || item.to === "/admin" || item.to === "/employee";

  const isChildActive = (item) =>
    item.children?.some((child) => location.pathname === child.to);

  const isItemActive = (item) =>
    item.to === "/employee/materi"
      ? location.pathname === item.to || location.pathname.startsWith("/employee/materi/")
      : item.to === "/employee/pretest"
      ? location.pathname === item.to || location.pathname.startsWith("/employee/pretest/")
      : item.to === "/employee/posttest"
      ? location.pathname === item.to || location.pathname.startsWith("/employee/posttest/")
      : isBaseMenu(item)
      ? location.pathname === item.to
      : location.pathname === item.to || isChildActive(item);

  const toggleSubmenu = (item) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [item.to]: !(prev[item.to] ?? isItemActive(item)),
    }));
  };

  const handleLogout = () => {
    authService
      .logout()
      .catch(() => undefined)
      .finally(() => window.location.assign("/"));
  };

  return (
    <aside className={`sidebar${isOpen ? " is-open" : ""}`}>
      <nav className="sidebar-nav" aria-label="Sidebar navigation">
        {menu.map((item) => {
          const itemActive = isItemActive(item);
          const expanded = Boolean(
            expandedMenus[item.to] ?? (item.children && itemActive)
          );

          return (
          <div key={item.id} className="sidebar-menu-group">
            <NavLink
              to={item.to}
              end={isBaseMenu(item)}
              className={({ isActive }) =>
                `sidebar-link${isActive || itemActive ? " active" : ""}${
                  item.children ? " has-submenu" : ""
                }`
              }
              onClick={onNavigate}
            >
              {() => (
                <>
                  <img
                    src={itemActive && item.activeIcon ? item.activeIcon : item.icon}
                    alt=""
                    className={`sidebar-icon${
                      item.activeIcon ? " sidebar-icon-stateful" : ""
                    }${item.id.endsWith("-history") ? " sidebar-icon-history" : ""}`}
                  />
                  <span>{item.label}</span>
                  {item.children && (
                    <button
                      type="button"
                      className={`sidebar-chevron${expanded ? " expanded" : ""}`}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        toggleSubmenu(item);
                      }}
                      aria-label={`${expanded ? "Sembunyikan" : "Tampilkan"} submenu ${item.label}`}
                    />
                  )}
                </>
              )}
            </NavLink>

            {item.children && (
              <div className={`sidebar-submenu${expanded ? " expanded" : ""}`}>
                {item.children.map((child) => (
                  <NavLink
                    key={child.id}
                    to={child.to}
                    className={({ isActive }) =>
                      `sidebar-submenu-link${isActive ? " active" : ""}`
                    }
                    onClick={onNavigate}
                  >
                    {child.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
          );
        })}
      </nav>

      <button type="button" className="sidebar-logout" onClick={handleLogout}>
        <img src={iconLogout} alt="" className="sidebar-icon" />
        <span>Logout</span>
      </button>
    </aside>
  );
}

export default Sidebar;
