import { useEffect, useState } from "react";

function CertificatePdfPreview({ loadPdf, title = "Preview sertifikat PDF" }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let objectUrl = "";

    loadPdf()
      .then(({ blob }) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch((previewError) => {
        if (active) setError(previewError.response?.data?.message || "Preview PDF gagal dimuat.");
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [loadPdf]);

  if (error) return <p className="employee-certificate-state employee-certificate-error">{error}</p>;
  if (!url) return <p className="employee-certificate-state">Memuat preview PDF...</p>;

  return <iframe className="certificate-pdf-preview" src={url} title={title} />;
}

export default CertificatePdfPreview;
