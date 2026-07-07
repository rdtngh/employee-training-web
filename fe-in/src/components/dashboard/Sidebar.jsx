import { NavLink } from "react-router-dom";
import "./Sidebar.css";

import iconHome from "../../assets/icons/icon-berandaputih.svg";
import iconUsers from "../../assets/icons/icon-kelolapenggunaputih.svg";
import iconMateri from "../../assets/icons/icon-kelola-materi.svg";
import iconExam from "../../assets/icons/icon-kelolaujianputih.svg";
import iconLogout from "../../assets/icons/icon-logout.svg";
import iconPreTest from "../../assets/icons/icon-kelolaujianputih.svg";
import iconPostTest from "../../assets/icons/icon-posttest.svg";
import iconMaterial from "../../assets/icons/icon-kelola-materi.svg";

const menuByRole = {
  superadmin: [
    { label: "Dashboard", to: "/superadmin", icon: iconHome },
    { label: "Kelola Pengguna", to: "/superadmin/manage-user", icon: iconUsers },
    { label: "Kelola Materi", to: "/superadmin/manage-materi", icon: iconMateri },
    { label: "Kelola Ujian", to: "/superadmin/manage-exam", icon: iconExam },
  ],
  admin: [
    { label: "Dashboard", to: "/admin", icon: iconHome },
    { label: "Kelola Materi", to: "/admin/manage-materi", icon: iconMateri },
    { label: "Kelola Ujian", to: "/admin/manage-exam", icon: iconExam },
  ],
  employee: [
    { label: "Dashboard", to: "/employee", icon: iconHome },
    { label: "Materi", to: "/employee/materi", icon: iconMaterial },
    { label: "Pre-Test", to: "/employee/pretest", icon: iconPreTest },
    { label: "Post-Test", to: "/employee/posttest", icon: iconPostTest },
  ],
};

function Sidebar({ role = "superadmin" }) {
  const menu = menuByRole[role] || menuByRole.superadmin;

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav" aria-label="Sidebar navigation">
        {menu.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            end={item.to === "/superadmin" || item.to === "/admin" || item.to === "/employee"}
            className={({ isActive }) =>
              `sidebar-link${isActive ? " active" : ""}`
            }
          >
            <img src={item.icon} alt="" className="sidebar-icon" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <button type="button" className="sidebar-logout" onClick={() => window.location.assign("/")}>
        <img src={iconLogout} alt="" className="sidebar-icon" />
        <span>Logout</span>
      </button>
    </aside>
  );
}

export default Sidebar;
