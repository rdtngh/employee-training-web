import "./Hero.css";
import heroImage from "../../assets/images/background-beranda.png";

function Hero() {
  return (
    <section className="hero">
      <img
        src={heroImage}
        alt="RS Advent Bandar Lampung"
        className="hero-image"
      />

      <div className="hero-overlay"></div>

      <div className="hero-content">
        <h1>
          Sistem Pelatihan Karyawan
          <br />
          RS Advent Bandar Lampung
        </h1>

        <p>
          Media pelatihan interaktif bagi karyawan baru rumah sakit
          dengan alur modern, materi terstruktur, dan penilaian digital.
        </p>
      </div>
    </section>
  );
}

export default Hero;