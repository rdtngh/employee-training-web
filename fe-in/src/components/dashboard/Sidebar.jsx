import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
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

const menuByRole = {
  superadmin: [
    {
      label: "Dashboard",
      to: "/superadmin",
      icon: iconHome,
      activeIcon: iconHomeActive,
    },
    {
      label: "Kelola Pengguna",
      to: "/superadmin/manage-user",
      icon: iconUsers,
      activeIcon: iconUsersActive,
    },
    { label: "Kelola Materi", to: "/superadmin/manage-materi", icon: iconMateri },
    {
      label: "Kelola Ujian",
      to: "/superadmin/manage-exam",
      icon: iconExam,
      activeIcon: iconExamActive,
      children: [
        { label: "Hasil Ujian", to: "/superadmin/exam-results" },
      ],
    },
  ],
  admin: [
    {
      label: "Dashboard",
      to: "/admin",
      icon: iconHome,
      activeIcon: iconHomeActive,
    },
    { label: "Kelola Materi", to: "/admin/manage-materi", icon: iconMateri },
    {
      label: "Kelola Ujian",
      to: "/admin/manage-exam",
      icon: iconExam,
      activeIcon: iconExamActive,
      children: [
        { label: "Hasil Ujian", to: "/admin/exam-results" },
      ],
    },
  ],
  employee: [
    {
      label: "Dashboard",
      to: "/employee",
      icon: iconHome,
      activeIcon: iconHomeActive,
    },
    { label: "Materi", to: "/employee/materi", icon: iconMaterial },
    {
      label: "Pre-Test",
      to: "/employee/pretest",
      icon: iconPreTest,
      activeIcon: iconExamActive,
    },
    { label: "Post-Test", to: "/employee/posttest", icon: iconPostTest },
  ],
};

function Sidebar({ role = "superadmin" }) {
  const menu = menuByRole[role] || menuByRole.superadmin;
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState({});

  const isBaseMenu = (item) =>
    item.to === "/superadmin" || item.to === "/admin" || item.to === "/employee";

  const isChildActive = (item) =>
    item.children?.some((child) => location.pathname === child.to);

  const isItemActive = (item) =>
    isBaseMenu(item)
      ? location.pathname === item.to
      : location.pathname === item.to || isChildActive(item);

  useEffect(() => {
    const activeParent = menu.find((item) => item.children && isItemActive(item));
    if (!activeParent) return;

    setExpandedMenus((prev) => ({ ...prev, [activeParent.to]: true }));
  }, [location.pathname, menu]);

  const toggleSubmenu = (item) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [item.to]: !prev[item.to],
    }));
  };

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav" aria-label="Sidebar navigation">
        {menu.map((item) => {
          const itemActive = isItemActive(item);
          const expanded = Boolean(expandedMenus[item.to]);

          return (
          <div key={item.label} className="sidebar-menu-group">
            <NavLink
              to={item.to}
              end={isBaseMenu(item)}
              className={({ isActive }) =>
                `sidebar-link${isActive || itemActive ? " active" : ""}${
                  item.children ? " has-submenu" : ""
                }`
              }
            >
              {() => (
                <>
                  <img
                    src={itemActive && item.activeIcon ? item.activeIcon : item.icon}
                    alt=""
                    className={`sidebar-icon${item.activeIcon ? " sidebar-icon-stateful" : ""}`}
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
                    key={child.label}
                    to={child.to}
                    className={({ isActive }) =>
                      `sidebar-submenu-link${isActive ? " active" : ""}`
                    }
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

      <button type="button" className="sidebar-logout" onClick={() => window.location.assign("/")}>
        <img src={iconLogout} alt="" className="sidebar-icon" />
        <span>Logout</span>
      </button>
    </aside>
  );
}

export default Sidebar;
