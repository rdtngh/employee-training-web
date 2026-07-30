import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Certificate from "../../components/certificate/Certificate";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import * as certificateService from "../../services/certificateService";
import "./EmployeeCertificatePage.css";

const defaultCertificateData = {
  employee_name: "",
  training_title: "",
};

const waitForCertificateAssets = async () => {
  await document.fonts?.ready;

  const images = [...document.querySelectorAll(".employee-certificate-stage img")];
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

function EmployeeCertificatePage() {
  const navigate = useNavigate();
  const { trainingId } = useParams();
  const [certificateData, setCertificateData] = useState(defaultCertificateData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    await waitForCertificateAssets();

    document.documentElement.classList.add("is-certificate-printing");
    document.body.classList.add("is-certificate-printing");

    const finishPrint = () => {
      window.setTimeout(() => {
        document.documentElement.classList.remove("is-certificate-printing");
        document.body.classList.remove("is-certificate-printing");
        window.removeEventListener("afterprint", finishPrint);
      }, 1000);
    };

    window.addEventListener("afterprint", finishPrint);
    window.setTimeout(() => window.print(), 250);
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
        {!loading && !error && (
          <section className="employee-certificate-stage">
            <Certificate
              employeeName={certificateData.employee_name}
              trainingTitle={certificateData.training_title}
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
