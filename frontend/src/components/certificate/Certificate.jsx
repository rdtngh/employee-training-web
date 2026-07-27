import { useEffect, useRef, useState } from "react";
import { certificateAssets } from "./certificateAssets";
import "./Certificate.css";

const DEFAULT_DIRECTOR = {
  name: "Dr. Charles Z. Suoth, MARS",
  title: "Direktur RSABL",
};

function Certificate({
  employeeName = "",
  trainingTitle = "",
  director = DEFAULT_DIRECTOR,
  signatureSrc = "",
}) {
  const previewRef = useRef(null);
  const [scale, setScale] = useState(1);
  const safeEmployeeName = employeeName || "Nama Karyawan";
  const safeTrainingTitle = trainingTitle || "Judul Pelatihan";
  const longName = safeEmployeeName.length > 30;

  useEffect(() => {
    const preview = previewRef.current;
    if (!preview) return undefined;

    const updateScale = () => {
      setScale(Math.min(preview.clientWidth / 841, 1));
    };

    updateScale();
    const resizeObserver = new ResizeObserver(updateScale);
    resizeObserver.observe(preview);

    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div
      className="certificate-preview-frame"
      ref={previewRef}
      style={{ height: `${595 * scale}px` }}
    >
      <article
        className="certificate-template"
        style={{ transform: `scale(${scale})` }}
        aria-label={`Sertifikat penghargaan untuk ${safeEmployeeName}`}
      >
        {certificateAssets.bgDaun && (
          <img
            src={certificateAssets.bgDaun}
            alt=""
            className="certificate-asset certificate-bg-daun"
            aria-hidden="true"
          />
        )}
        {certificateAssets.frameGold && (
          <img
            src={certificateAssets.frameGold}
            alt=""
            className="certificate-asset certificate-frame-gold"
            aria-hidden="true"
          />
        )}
        {certificateAssets.sudutAtas && (
          <img
            src={certificateAssets.sudutAtas}
            alt=""
            className="certificate-asset certificate-sudut-atas"
            aria-hidden="true"
          />
        )}
        {certificateAssets.sudutBawah && (
          <img
            src={certificateAssets.sudutBawah}
            alt=""
            className="certificate-asset certificate-sudut-bawah"
            aria-hidden="true"
          />
        )}
        {certificateAssets.daunKananAtas && (
          <img
            src={certificateAssets.daunKananAtas}
            alt=""
            className="certificate-asset certificate-daun-kanan-atas"
            aria-hidden="true"
          />
        )}
        {certificateAssets.piagam && (
          <img
            src={certificateAssets.piagam}
            alt=""
            className="certificate-asset certificate-piagam"
            aria-hidden="true"
          />
        )}

        <div className="certificate-content">
          <header className="certificate-title-block">
            <h1>SERTIFIKAT</h1>
            <p>PENGHARGAAN</p>
            {certificateAssets.garisGold && (
              <img
                src={certificateAssets.garisGold}
                alt=""
                className="certificate-garis-gold"
                aria-hidden="true"
              />
            )}
          </header>

          <section className="certificate-recipient">
            <p className="certificate-given-text">
              Sertifikat penghargaan ini diberikan kepada:
            </p>
            <h2 className={longName ? "is-long-name" : ""}>{safeEmployeeName}</h2>
            <div className="certificate-name-line" aria-hidden="true" />
          </section>

          <section className="certificate-training">
            <p>telah berhasil mengikuti dan menyelesaikan</p>
            <h3>{safeTrainingTitle}</h3>
          </section>

          <section className="certificate-signature">
            <div className="certificate-signature-space">
              {signatureSrc && (
                <img src={signatureSrc} alt="" className="certificate-signature-image" />
              )}
            </div>
            <div className="certificate-director-line" aria-hidden="true" />
            <p className="certificate-director-name">{director.name}</p>
            <p className="certificate-director-title">{director.title}</p>
          </section>
        </div>
      </article>
    </div>
  );
}

export default Certificate;
