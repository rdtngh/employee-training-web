import "./LandingPage.css";
import Navbar from "../../components/landing/Navbar";
import Hero from "../../components/landing/Hero";
import Footer from "../../components/common/Footer";

function LandingPage() {
  return (
    <div className="landing-page">
      <Navbar />
      <Hero />
      <Footer />
    </div>
  );
}

export default LandingPage;