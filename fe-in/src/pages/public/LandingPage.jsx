import "./LandingPage.css";
import Navbar from "../../components/landing/Navbar";
import Hero from "../../components/landing/Hero";
import Footer from "../../components/common/Footer";
import backgroundImage from "../../assets/images/background-beranda.png";

function LandingPage() {
  return (
    <div className="landing-page">
      <img
        src={backgroundImage}
        alt="Background RS Advent Bandar Lampung"
        className="landing-background"
      />

      <div className="landing-overlay"></div>

      <Navbar />

      <main className="landing-content">
        <Hero />
      </main>

      <Footer />
    </div>
  );
}

export default LandingPage;