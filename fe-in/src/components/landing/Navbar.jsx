import "./Navbar.css";
import { Link } from "react-router-dom";

import logo from "../../assets/logo/logo-rsabl.png";

function Navbar({
  buttonText = "LOG IN",
  buttonLink = "/login",
  showButton = true,
}) {
  return (
    <header className="navbar">
      <div className="navbar-left">
        <img
          src={logo}
          alt="Logo RS Advent"
          className="navbar-logo"
        />

        <div className="navbar-title">
          <h1>RUMAH SAKIT ADVENT</h1>
          <h2>BANDAR LAMPUNG</h2>
        </div>
      </div>

      {showButton ? (
        <Link to={buttonLink} className="login-btn">
          {buttonText}
        </Link>
      ) : null}
    </header>
  );
}

export default Navbar;