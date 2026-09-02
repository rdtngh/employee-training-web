import { useEffect, useRef, useState } from "react";
import { certificateAssets } from "./certificateAssets";
import "./Certificate.css";

const formatCertificateName = (value) => {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\b([a-z])/g, (match) => match.toUpperCase());
};

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
const CERTIFICATE_WIDTH = 841;
const CERTIFICATE_HEIGHT = 595;
const DEFAULT_TEMPLATE_FIELDS = {
  certificate_number: {
    x: 140,
    y: 154,
    width: 561,
    fontSize: 12,
    color: "#000000",
    align: "center",
    fontFamily: "sans",
    fontWeight: "400",
  },
  employee_name: {
    x: 90,
    y: 220,
    width: 661,
    fontSize: 62,
    color: "#b99645",
    align: "center",
    fontFamily: "script",
    fontWeight: "400",
  },
  training_title: {
    x: 175,
    y: 340,
    width: 491,
    fontSize: 17,
    color: "#000000",
    align: "center",
    fontFamily: "sans",
    fontWeight: "700",
  },
  completion_date: {
    x: 175,
    y: 408,
    width: 491,
    fontSize: 14,
    color: "#000000",
    align: "center",
    fontFamily: "sans",
    fontWeight: "400",
  },
};

const FONT_FAMILIES = {
  sans: '"Poppins", sans-serif',
  montserrat: '"Montserrat", sans-serif',
  serif: '"Playfair Display", Georgia, serif',
  merriweather: '"Merriweather", Georgia, serif',
  lora: '"Lora", Georgia, serif',
  cinzel: '"Cinzel", Georgia, serif',
  cormorant: '"Cormorant Garamond", Georgia, serif',
  script: '"Great Vibes", "Brush Script MT", cursive',
  dancing: '"Dancing Script", "Brush Script MT", cursive',
  allura: '"Allura", "Brush Script MT", cursive',
  pacifico: '"Pacifico", "Brush Script MT", cursive',
};

const templateFieldStyle = (certificateTemplate, fieldName) => {
  const field = {
    ...DEFAULT_TEMPLATE_FIELDS[fieldName],
    ...(certificateTemplate?.settings?.fields?.[fieldName] ?? {}),
  };

  return {
    left: `${field.x}px`,
    top: `${field.y}px`,
    width: `${field.width}px`,
    color: field.color,
    fontSize: `${field.fontSize}px`,
    fontFamily: FONT_FAMILIES[field.fontFamily] ?? FONT_FAMILIES.sans,
    fontWeight: field.fontWeight,
    textAlign: field.align,
  };
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
  certificateTemplate = null,
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
  const customTemplateUrl = certificateTemplate?.background_url;
  const isTestingCertificate = safeCertificateNumber.startsWith("TEST-");

  useEffect(() => {
    const preview = previewRef.current;
    if (!preview) return undefined;

    const updateScale = () => {
      setScale(Math.min(Math.max(preview.clientWidth / CERTIFICATE_WIDTH, 0), 1));
    };

    updateScale();

    if (typeof ResizeObserver === "function") {
      const resizeObserver = new ResizeObserver(updateScale);
      resizeObserver.observe(preview);

      return () => resizeObserver.disconnect();
    }

    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  return (
    <div
      className="certificate-preview-frame"
      ref={previewRef}
      style={{ height: `${CERTIFICATE_HEIGHT * scale}px` }}
    >
      <article
        className={`certificate-template${customTemplateUrl ? " has-custom-template" : ""}`}
        style={{ transform: `scale(${scale})` }}
        aria-label={`Sertifikat penghargaan untuk ${safeEmployeeName}`}
      >
        {customTemplateUrl && (
          <img
            src={customTemplateUrl}
            alt=""
            className="certificate-custom-background"
            aria-hidden="true"
          />
        )}
        {!customTemplateUrl && certificateAssets.bgDaun && (
          <img
            src={certificateAssets.bgDaun}
            alt=""
            className="certificate-asset certificate-bg-daun"
            aria-hidden="true"
          />
        )}
        {!customTemplateUrl && certificateAssets.frameGold && (
          <img
            src={certificateAssets.frameGold}
            alt=""
            className="certificate-asset certificate-frame-gold"
            aria-hidden="true"
          />
        )}
        {!customTemplateUrl && certificateAssets.sudutAtas && (
          <img
            src={certificateAssets.sudutAtas}
            alt=""
            className="certificate-asset certificate-sudut-atas"
            aria-hidden="true"
          />
        )}
        {!customTemplateUrl && certificateAssets.sudutBawah && (
          <img
            src={certificateAssets.sudutBawah}
            alt=""
            className="certificate-asset certificate-sudut-bawah"
            aria-hidden="true"
          />
        )}
        {!customTemplateUrl && certificateAssets.daunKananAtas && (
          <img
            src={certificateAssets.daunKananAtas}
            alt=""
            className="certificate-asset certificate-daun-kanan-atas"
            aria-hidden="true"
          />
        )}
        {!customTemplateUrl && certificateAssets.piagam && (
          <img
            src={certificateAssets.piagam}
            alt=""
            className="certificate-asset certificate-piagam"
            aria-hidden="true"
          />
        )}

        {customTemplateUrl ? (
          <div className="certificate-content certificate-custom-content">
            {safeCertificateNumber && (
              <p
                className="certificate-custom-field certificate-custom-number"
                style={templateFieldStyle(certificateTemplate, "certificate_number")}
              >
                {safeCertificateNumber}
              </p>
            )}
            {isTestingCertificate && (
              <p className="certificate-testing-note">Sertifikat Data Testing - Bukan Sertifikat Resmi</p>
            )}
            <h2
              className={[
                "certificate-custom-field",
                "certificate-custom-name",
                longName ? "is-long-name" : "",
                veryLongName ? "is-very-long-name" : "",
              ].filter(Boolean).join(" ")}
              style={templateFieldStyle(certificateTemplate, "employee_name")}
            >
              {safeEmployeeName}
            </h2>
            <p
              className="certificate-custom-field certificate-custom-training"
              style={templateFieldStyle(certificateTemplate, "training_title")}
            >
              {safeTrainingTitle}
            </p>
            {completionDateText && (
              <p
                className="certificate-custom-field certificate-custom-date"
                style={templateFieldStyle(certificateTemplate, "completion_date")}
              >
                Bandar Lampung, {completionDateText}
              </p>
            )}
          </div>
        ) : (
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
            {isTestingCertificate && (
              <p className="certificate-testing-note">Sertifikat Data Testing - Bukan Sertifikat Resmi</p>
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
        )}
      </article>
    </div>
  );
}

export default Certificate;
