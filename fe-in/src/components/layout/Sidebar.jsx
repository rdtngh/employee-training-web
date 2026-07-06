import { Link } from "react-router-dom";

import logo from "../../assets/logo/logo-rsabl.png";

import iconBeranda from "../../assets/icons/icon-berandaputih.svg";
import iconMateri from "../../assets/icons/icon-daftar-materi.svg";
import iconPreTest from "../../assets/icons/icon-biodata.svg";
import iconPostTest from "../../assets/icons/icon-posttest.svg";
import iconLogout from "../../assets/icons/icon-logout.svg";

function Sidebar() {
  return (
    <aside>

  <header>

    <img
      src={logo}
      alt="Logo Rumah Sakit Advent"
    />

    <div>

      <h2>Rumah Sakit Advent</h2>

      <p>Bandar Lampung</p>

    </div>

  </header>

  <nav>

  <Link to="/employee/dashboard">

    <img
      src={iconBeranda}
      alt="Beranda"
    />

    <span>Beranda</span>

  </Link>

  <Link to="/employee/materi">

    <img
      src={iconMateri}
      alt="Materi"
    />

    <span>Materi</span>

  </Link>

  <Link to="/employee/pretest">

    <img
      src={iconPreTest}
      alt="Pre Test"
    />

    <span>Pre Test</span>

  </Link>

  <Link to="/employee/posttest">

    <img
      src={iconPostTest}
      alt="Post Test"
    />

    <span>Post Test</span>

  </Link>

</nav>

<footer>

  <Link to="/">

    <img
      src={iconLogout}
      alt="Logout"
    />

    <span>Logout</span>

  </Link>

</footer>

    </aside>
  );
}

export default Sidebar;