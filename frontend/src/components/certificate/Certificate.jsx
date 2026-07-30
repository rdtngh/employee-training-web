import { useEffect, useRef, useState } from "react";
import { certificateAssets } from "./certificateAssets";
import "./Certificate.css";

const formatCertificateName = (value) =>
  String(value || "")
    .trim()
    .toLocaleLowerCase("id-ID")
    .replace(/(^|[\s-])(\S)/g, (match) => match.toLocaleUpperCase("id-ID"));

const ROMAN_MONTHS = [
  "",
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
];

const parseDateValue = (value) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  const text = String(value);
  const dateOnly = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateOnly) {
    return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatIndonesianDate = (value) => {
  const date = parseDateValue(value);
  if (!date) return "";

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
};

const formatRomanMonth = (value, fallbackDate) => {
  if (value) {
    const month = Number(value);
    if (Number.isInteger(month) && month >= 1 && month <= 12) return ROMAN_MONTHS[month];
    return String(value).trim().toUpperCase();
  }

  const date = parseDateValue(fallbackDate);
  return date ? ROMAN_MONTHS[date.getMonth() + 1] : "";
};

const buildCertificateNumber = ({
  certificateNumber,
  sequenceNumber,
  romanMonth,
  year,
  completionDate,
}) => {
  const rawNumber = String(certificateNumber || "").trim();
  const rawSequence = String(sequenceNumber || "").trim();
  const completion = parseDateValue(completionDate);
  const displayMonth = formatRomanMonth(romanMonth, completionDate);
  const displayYear = year || (completion ? completion.getFullYear() : "");

  if (rawSequence && displayMonth && displayYear) {
    return `NO: ${rawSequence}/DIKLATLIT-RSABL/${displayMonth}/${displayYear}`;
  }

  if (!rawNumber) return "";
  if (rawNumber.toUpperCase().startsWith("NO:")) return rawNumber;
  return `NO: ${rawNumber}`;
};

const DEFAULT_DIRECTOR = {
  name: "Dr. Charles Z. Suoth, MARS",
  title: "Direktur RSABL",
};

function Certificate({
  employeeName = "",
  trainingTitle = "",
  trainingName = "",
  certificateNumber = "",
  sequenceNumber = "",
  romanMonth = "",
  year = "",
  completionDate = "",
  director = DEFAULT_DIRECTOR,
  signatureSrc = certificateAssets.ttdDirektur,
}) {
  const previewRef = useRef(null);
  const [scale, setScale] = useState(1);
  const safeEmployeeName = formatCertificateName(employeeName) || "Nama Karyawan";
  const safeTrainingTitle = trainingName || trainingTitle || "Judul Pelatihan";
  const safeCertificateNumber = buildCertificateNumber({
    certificateNumber,
    sequenceNumber,
    romanMonth,
    year,
    completionDate,
  });
  const completionDateText = formatIndonesianDate(completionDate);
  const longName = safeEmployeeName.length > 21;
  const veryLongName = safeEmployeeName.length > 34;

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

          <section className="certificate-brand" aria-label="Rumah Sakit Advent Bandar Lampung">
            {certificateAssets.logoRsabl && (
              <img src={certificateAssets.logoRsabl} alt="" aria-hidden="true" />
            )}
            <p>
              <span>Rumah Sakit Advent</span>
              <span>Bandar Lampung</span>
            </p>
          </section>

          {safeCertificateNumber && (
            <p className="certificate-number">{safeCertificateNumber}</p>
          )}

          <section className="certificate-recipient">
            <p className="certificate-given-text">
              Sertifikat ini diberikan kepada:
            </p>
            <h2
              className={[
                longName ? "is-long-name" : "",
                veryLongName ? "is-very-long-name" : "",
              ].filter(Boolean).join(" ")}
            >
              {safeEmployeeName}
            </h2>
            <div className="certificate-name-line" aria-hidden="true" />
          </section>

          <section className="certificate-training">
            <p>Telah mengikuti dan dinyatakan lulus pada</p>
            <h3>{safeTrainingTitle}</h3>
            {completionDateText && (
              <>
                <p className="certificate-training-date">
                  pada tanggal {completionDateText}
                </p>
                <p className="certificate-location">BANDAR LAMPUNG</p>
              </>
            )}
          </section>

          <section className="certificate-signature">
            <div className="certificate-signature-space">
              {signatureSrc && (
                <img
                  src={signatureSrc}
                  alt=""
                  className="certificate-signature-image"
                  aria-hidden="true"
                />
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
