import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import Certificate from "../../components/certificate/Certificate";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import * as certificateService from "../../services/certificateService";
import "./EmployeeCertificatePage.css";

const defaultCertificateData = {
  employee_name: "",
  training_title: "",
  certificate_number: "",
  sequence_number: "",
  roman_month: "",
  year: "",
  completion_date: "",
};

const waitForCertificateAssets = async () => {
  await document.fonts?.ready;

  const images = [
    ...document.querySelectorAll(
      ".employee-certificate-stage img, .employee-certificate-print-stage img"
    ),
  ];
  await Promise.all(
    images.map((image) => {
      if (image.complete) return Promise.resolve();

      return new Promise((resolve) => {
        image.addEventListener("load", resolve, { once: true });
        image.addEventListener("error", resolve, { once: true });
      });
    })
  );
};

const waitForNextPaint = () =>
  new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });

function EmployeeCertificatePage() {
  const navigate = useNavigate();
  const { trainingId } = useParams();
  const [certificateData, setCertificateData] = useState(defaultCertificateData);
  const [loading, setLoading] = useState(true);
  const [printMode, setPrintMode] = useState(false);
  const [error, setError] = useState("");
  const [downloadError, setDownloadError] = useState("");

  useEffect(() => {
    let active = true;

    certificateService
      .getCertificatePreview(trainingId)
      .then((data) => {
        if (!active) return;
        setCertificateData(data);
        setError("");
      })
      .catch((error) => {
        if (!active) return;
        setError(
          error.response?.data?.message ||
            error.message ||
            "Sertifikat belum dapat dimuat. Silakan coba lagi."
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [trainingId]);

  async function downloadCertificate() {
    setDownloadError("");
    flushSync(() => setPrintMode(true));
    document.documentElement.classList.add("is-certificate-printing");
    document.body.classList.add("is-certificate-printing");

    const finishPrint = () => {
      window.setTimeout(() => {
        document.documentElement.classList.remove("is-certificate-printing");
        document.body.classList.remove("is-certificate-printing");
        setPrintMode(false);
        window.removeEventListener("afterprint", finishPrint);
      }, 500);
    };

    try {
      await waitForNextPaint();
      await waitForCertificateAssets();
      await waitForNextPaint();
      window.addEventListener("afterprint", finishPrint);
      window.print();
    } catch (error) {
      setDownloadError(
        error.message || "Sertifikat gagal disiapkan. Silakan coba lagi."
      );
      finishPrint();
    }
  }

  if (printMode) {
    return (
      <main className="employee-certificate-print-page" aria-label="Sertifikat siap dicetak">
        <section className="employee-certificate-print-stage">
          <Certificate
            employeeName={certificateData.employee_name}
            trainingTitle={certificateData.training_title}
            certificateNumber={certificateData.certificate_number}
            sequenceNumber={certificateData.sequence_number}
            romanMonth={certificateData.roman_month}
            year={certificateData.year}
            completionDate={certificateData.completion_date || certificateData.issued_at}
            certificateTemplate={certificateData.certificate_template}
          />
        </section>
      </main>
    );
  }

  return (
    <DashboardLayout role="employee">
      <main className="employee-certificate-page">
        <header className="employee-certificate-header">
          <div>
            <h1>Preview Sertifikat</h1>
          </div>
          <div className="employee-certificate-actions">
            {!loading && !error && (
              <button
                type="button"
                className="employee-certificate-download"
                onClick={downloadCertificate}
              >
                Download Sertifikat
              </button>
            )}
          </div>
        </header>

        {loading && <p className="employee-certificate-state">Memuat sertifikat...</p>}
        {error && (
          <p className="employee-certificate-state employee-certificate-error" role="alert">
            {error}
          </p>
        )}
        {downloadError && (
          <p className="employee-certificate-alert" role="alert">
            {downloadError}
          </p>
        )}
        {!loading && !error && (
          <section className="employee-certificate-stage">
            <Certificate
              employeeName={certificateData.employee_name}
              trainingTitle={certificateData.training_title}
              certificateNumber={certificateData.certificate_number}
              sequenceNumber={certificateData.sequence_number}
              romanMonth={certificateData.roman_month}
              year={certificateData.year}
              completionDate={certificateData.completion_date || certificateData.issued_at}
              certificateTemplate={certificateData.certificate_template}
            />
          </section>
        )}

        <button
          type="button"
          className="employee-certificate-back"
          onClick={() => navigate(-1)}
        >
          Back
        </button>
      </main>
    </DashboardLayout>
  );
}

export default EmployeeCertificatePage;
