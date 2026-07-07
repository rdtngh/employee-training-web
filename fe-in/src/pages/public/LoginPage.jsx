import "./LoginPage.css";

import Navbar from "../../components/landing/Navbar";
import LoginCard from "../../components/login/LoginCard";
import Footer from "../../components/common/Footer";

import backgroundImage from "../../assets/images/background-beranda.png";

function LoginPage() {
  return (
    <div className="login-page">

      <img
        src={backgroundImage}
        alt="Background RS Advent Bandar Lampung"
        className="login-background"
      />

      <div className="login-overlay"></div>

      <Navbar
        buttonText="BERANDA"
        buttonLink="/"
      />

      <main className="login-content">
        <LoginCard />
      </main>

      <Footer />

    </div>
  );
}

export default LoginPage;