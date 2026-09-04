import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import * as certificateService from "../../services/certificateService";
import * as trainingHistoryService from "../../services/trainingHistoryService";
import Certificate from "../certificate/Certificate";
import "../certificate/CertificateDashboard.css";
import "../../pages/employee/EmployeeCertificatePage.css";
import "./TrainingHistoryDashboard.css";
import { jsPDF } from "jspdf";

function TrainingHistoryDashboard({
  historyData,
  certificateData,
  certificatesLoading,
  loading,
  error,
  reload,
  role,
}) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [pendingEditDate, setPendingEditDate] = useState(null);
  const [newDate, setNewDate] = useState("");
  const [updatingDate, setUpdatingDate] = useState(false);

  const [actionError, setActionError] = useState("");
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [bulkPreview, setBulkPreview] = useState(null);

  const histories = useMemo(
    () => historyData?.histories ?? [],
    [historyData?.histories],
  );
  const certificates = useMemo(
    () => certificateData?.certificates ?? [],
    [certificateData?.certificates],
  );

  const trainingOptions = useMemo(() => {
    const options = new Map();
    histories.forEach((history) =>
      options.set(String(history.training.id), history.training.title),
    );
    return [...options.entries()]
      .map(([id, title]) => ({ id, title }))
      .sort((a, b) => a.title.localeCompare(b.title, "id-ID"));
  }, [histories]);

  const requestedTrainingId = searchParams.get("training") || "all";
  const selectedTrainingId =
    requestedTrainingId === "all" ||
    trainingOptions.some((training) => training.id === requestedTrainingId)
      ? requestedTrainingId
      : "all";

  function selectTraining(trainingId) {
    const nextParams = new URLSearchParams(searchParams);
    if (trainingId === "all") {
      nextParams.delete("training");
    } else {
      nextParams.set("training", trainingId);
    }
    setSearchParams(nextParams, { replace: true });
  }

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return histories.filter((history) => {
      if (
        selectedTrainingId !== "all" &&
        String(history.training.id) !== selectedTrainingId
      ) {
        return false;
      }
      if (!keyword) return true;
      return [
        history.employee?.name,
        history.employee?.employee_number,
        history.training?.title,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }, [histories, query, selectedTrainingId]);

  const availableCertificates = useMemo(() => {
    return filtered
      .filter((history) => history.certificate)
      .map((history) => history.certificate);
  }, [filtered]);

  useEffect(
    () => () => {
      if (bulkPreview?.url) {
        URL.revokeObjectURL(bulkPreview.url);
      }
    },
    [bulkPreview?.url],
  );

  // ====================================================================
  // FUNGSI UTAMA BATCH DOWNLOAD (BASE64 + HTML IFRAME - 2 HALAMAN)
  // ====================================================================
  async function printFilteredCertificates() {
    if (availableCertificates.length === 0) {
      setActionError("Tidak ada sertifikat pada pencarian/pelatihan yang dipilih.");
      return;
    }
    const selectedIds = availableCertificates.map((cert) => cert.id);

    setActionError("");
    setBulkDownloading(true);

    try {
      const myToken = localStorage.getItem("authToken");
      if (!myToken) throw new Error("Sesi login tidak valid. Silakan login ulang.");

      const response = await fetch(
        `https://apidiklat.rsabl.com/api/certificates/batch-download`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${myToken}`,
          },
          body: JSON.stringify({ certificate_ids: selectedIds }),
        }
      );

      if (!response.ok) throw new Error("Gagal mengambil data dari server.");
      const data = await response.json();

      if (!data.success || !data.employee_package || !data.template_package) {
        throw new Error("Format data sertifikat dari server tidak valid.");
      }

      const items = data.employee_package;
      const { assets, templates } = data.template_package;

      // Konversi background custom (Halaman 1 & Halaman 2) ke Base64
      for (const key of Object.keys(templates)) {
        const tpl = templates[key];
        
        const convertToBase64 = async (url) => {
          if (!url || url.startsWith("data:image")) return url;
          let targetUrl = url;
          if (targetUrl.includes("localhost")) {
            targetUrl = targetUrl.replace(/https?:\/\/localhost(:\d+)?/, "https://apidiklat.rsabl.com");
          }
          try {
            const fetchOptions = targetUrl.includes("/assets/") 
              ? {} 
              : { headers: { Authorization: `Bearer ${myToken}` } };
            const imgRes = await fetch(targetUrl, fetchOptions);
            if (imgRes.ok) {
              const blob = await imgRes.blob();
              return await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
              });
            }
          } catch (err) {
            console.error("Gagal load background:", err);
          }
          return url;
        };

        if (tpl.type === "custom") {
          if (tpl.background) tpl.background = await convertToBase64(tpl.background);
          if (tpl.background_page2) tpl.background_page2 = await convertToBase64(tpl.background_page2);
        }
      }

      let combinedHtml = `
        <!doctype html>
        <html lang="id">
        <head>
            <meta charset="utf-8">
            <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;500;600;700&family=Montserrat:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Great+Vibes&family=Pinyon+Script&display=swap" rel="stylesheet">
            <style>
                @media print {
                  * {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                  @page { margin: 0; size: 841px 595px; }
                  body, html { margin: 0; padding: 0; }
                }
                
                * { box-sizing: border-box; }
                html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #fff; }
                
                .certificate { width: 841px; height: 595px; position: relative; overflow: hidden; background: #ffffff; page-break-after: always; display: block; margin: 0; padding: 0; }
                .custom-background { position: absolute; z-index: 1; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; }
                .custom-field { position: absolute; z-index: 2; margin: 0; line-height: 1.2; overflow: hidden; }

                .asset { position: absolute; display: block; }
                .bg-daun { z-index: 2; top: 49px; left: 160px; width: 521px; height: 421px; opacity: .5; }
                .frame-gold { z-index: 1; top: 0; left: 0; width: 100%; height: 100%; }
                .sudut-atas { z-index: 3; top: -6px; left: -2px; width: 206px; height: 335px; }
                .sudut-bawah { z-index: 3; right: -2px; bottom: -6px; width: 206px; height: 335px; }
                .daun-kanan-atas { z-index: 3; top: -2px; right: 0; width: 198px; height: 196px; opacity: .38; }
                .piagam { z-index: 3; left: 90px; bottom: 120px; width: 130px; height: 150px; }
                .content { position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: 4; }
                .title-block { position: absolute; top: 54px; left: 0; width: 100%; text-align: center; }
                .title { margin: 0; font-family: Georgia, serif; font-size: 58px; font-weight: 700; line-height: 1; }
                .subtitle { margin: 4px 0 0; font-family: Georgia, serif; font-size: 26px; font-weight: 500; letter-spacing: .15em; }
                .brand { position: absolute; z-index: 6; top: 50px; right: 35px; width: 175px; text-align: center; }
                .brand img { width: 60px; height: 60px; margin: 0 auto; display: block; }
                .brand p { margin: 5px 0 0; color: #327537; font-size: 15px; font-weight: 700; line-height: 1.18; }
                .brand span { display: block; }
                .certificate-number { position: absolute; z-index: 5; top: 164px; left: 140px; width: 561px; margin: 0; font-size: 11px; text-align: center; }
                .testing-note { position: absolute; z-index: 5; top: 180px; left: 140px; width: 561px; margin: 0; color: #9b1c1c; font-size: 9px; font-weight: 700; text-align: center; text-transform: uppercase; }
                .recipient { position: absolute; z-index: 5; top: 220px; left: 140px; width: 561px; text-align: center; }
                .given-text { margin: 0 0 13px; font-size: 14px; }
                .participant { color: #b99645; font-family: 'Great Vibes', cursive; font-weight: 400; white-space: nowrap; margin: -10px auto -8px; }
                .name-line { width: 300px; height: 2px; margin: 8px auto 0; background: #b99645; }
                .training-block { position: absolute; z-index: 5; top: 345px; left: 175px; width: 491px; text-align: center; }
                .training-label { margin: 0; font-size: 14px; }
                .training-title { margin: 4px auto 0; color: #000000; font-size: 15px; font-weight: 700; }
                .training-date { margin: 3px 0 0; font-size: 14px; }
                .training-location { margin: 1px 0 0; font-size: 12px; font-weight: 600; }
                .signature { position: absolute; z-index: 6; top: 456px; left: 290px; width: 260px; text-align: center; }
                .signature-space { height: 45px; }
                .signature-image { max-width: 180px; max-height: 70px; object-fit: contain; }
                .signature-line { width: 122px; height: 0; margin: 0 auto 7px; border-top: 2px solid #000000; }
                .director-name { margin: 0; font-size: 13px; }
                .director-title { margin: 2px 0 0; font-size: 15px; }
                
                /* CSS HALAMAN 2 DENGAN BACKGROUND GAMBAR */
                /* CSS HALAMAN 2 DENGAN BACKGROUND GAMBAR (DAFTAR MATERI DINAIKKAN) */
                .back-page { 
                  position: relative; 
                  width: 841px; 
                  height: 595px; 
                  overflow: hidden; 
                  background: #ffffff; 
                  page-break-after: always; 
                  display: block; 
                  margin: 0; 
                  padding: 40px 80px; /* Padding atas diperkecil agar konten naik ke atas */
                }
                .back-background { 
                  position: absolute; 
                  z-index: 1; 
                  top: 0; 
                  left: 0; 
                  width: 100%; 
                  height: 100%; 
                  object-fit: cover; 
                }
                .back-content { 
                  position: relative; 
                  z-index: 2; 
                  height: 100%;
                  display: flex;
                  flex-direction: column;
                  justify-content: flex-start; /* Mengubah posisi dari tengah ke atas */
                  padding-top: 20px; /* Jarak dari atas kertas */
                }
                .back-title { 
                  text-align: center; 
                  font-family: Arial, sans-serif; 
                  font-size: 18px; 
                  font-weight: bold; 
                  margin-bottom: 25px; 
                  text-transform: uppercase; 
                  color: #000;
                }
                .materials-table { 
                  width: 100%; 
                  border-collapse: collapse; 
                  font-family: Arial, sans-serif; 
                  font-size: 13px; 
                  background: rgba(255, 255, 255, 0.95); 
                  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .materials-table th, .materials-table td { 
                  border: 1px solid #333; 
                  padding: 8px 12px; 
                }
                .materials-table th { 
                  background-color: #f2f2f2; 
                  font-weight: bold; 
                  text-align: center; 
                }
            </style>
        </head>
        <body>
      `;

      items.forEach((item) => {
        const fontSize =
          item.participantName.length > 34
            ? 40
            : item.participantName.length > 21
              ? 48
              : 60;

        combinedHtml += `<div class="certificate">`;

        const currentTemplate =
          templates[item.templateKey] || templates["default"];

        if (
          currentTemplate &&
          currentTemplate.type === "custom" &&
          currentTemplate.background
        ) {
          combinedHtml += `<img src="${currentTemplate.background}" class="custom-background" alt="">`;

          const fontFamilies = {
            sans: "Arial, sans-serif",
            montserrat: "'Montserrat', sans-serif",
            serif: "'Playfair Display', Georgia, serif",
            merriweather: "'Merriweather', serif",
            script: "'Great Vibes', cursive",
            dancing: "'Dancing Script', cursive",
          };

          const customValues = {
            certificate_number: item.certificateNumber,
            employee_name: item.participantName,
            training_title: item.trainingTitle,
            completion_date: item.completionDate
              ? "Bandar Lampung, " + item.completionDate
              : "",
          };

          const fields = currentTemplate.settings.fields || {};
          for (const [fieldKey, fieldValue] of Object.entries(customValues)) {
            if (fieldValue && fields[fieldKey]) {
              const f = fields[fieldKey];
              const fontFamily =
                fontFamilies[f.fontFamily || "sans"] || "Arial, sans-serif";
              combinedHtml += `<p class="custom-field" style="left: ${f.x}px; top: ${f.y}px; width: ${f.width}px; color: ${f.color}; font-size: ${f.fontSize}px; font-family: ${fontFamily}; font-weight: ${f.fontWeight}; text-align: ${f.align};">${fieldValue}</p>`;
            }
          }

          if (item.isTestingCertificate) {
            combinedHtml += `<p class="testing-note" style="top: 15px; left: 20px; width: auto; z-index:3;">Sertifikat Data Testing</p>`;
          }
        } else {
          if (assets.bgDaun)
            combinedHtml += `<img src="${assets.bgDaun}" class="asset bg-daun" alt="">`;
          if (assets.frameGold)
            combinedHtml += `<img src="${assets.frameGold}" class="asset frame-gold" alt="">`;
          if (assets.sudutAtas)
            combinedHtml += `<img src="${assets.sudutAtas}" class="asset sudut-atas" alt="">`;
          if (assets.sudutBawah)
            combinedHtml += `<img src="${assets.sudutBawah}" class="asset sudut-bawah" alt="">`;
          if (assets.daunKananAtas)
            combinedHtml += `<img src="${assets.daunKananAtas}" class="asset daun-kanan-atas" alt="">`;
          if (assets.piagam)
            combinedHtml += `<img src="${assets.piagam}" class="asset piagam" alt="">`;

          combinedHtml += `
                <div class="content">
                    <div class="title-block">
                        <h1 class="title">SERTIFIKAT</h1>
                        <p class="subtitle">PENGHARGAAN</p>
                        ${assets.garisGold ? `<img src="${assets.garisGold}" style="position:absolute; top:57px; left:132px; width:577px; height:51px;" alt="">` : ""}
                    </div>
        
                    <div class="brand">
                        ${assets.logoRsabl ? `<img src="${assets.logoRsabl}" alt="">` : ""}
                        <p><span>Rumah Sakit Advent</span><span>Bandar Lampung</span></p>
                    </div>
        
                    ${item.certificateNumber ? `<p class="certificate-number">${item.certificateNumber}</p>` : ""}
                    ${item.isTestingCertificate ? `<p class="testing-note">Sertifikat Data Testing - Bukan Sertifikat Resmi</p>` : ""}
        
                    <div class="recipient">
                        <p class="given-text">Sertifikat ini diberikan kepada:</p>
                        <div class="participant" style="font-size: ${fontSize}px;">${item.participantName}</div>
                        <div class="name-line"></div>
                    </div>
        
                    <div class="training-block">
                        <p class="training-label">Telah mengikuti dan dinyatakan lulus pada</p>
                        <p class="training-title">${item.trainingTitle}</p>
                        <p class="training-date">pada tanggal ${item.completionDate}.</p>
                        <p class="training-location">BANDAR LAMPUNG</p>
                    </div>
        
                    <div class="signature">
                        <div class="signature-space">
                            ${assets.ttdDirektur ? `<img src="${assets.ttdDirektur}" class="signature-image" alt="">` : ""}
                        </div>
                        <div class="signature-line"></div>
                        <p class="director-name">Dr. Charles Z. Suoth, MARS</p>
                        <p class="director-title">Direktur RSABL</p>
                    </div>
                </div>
              `;
        }

        combinedHtml += `</div>`;
        
        // RENDER HALAMAN 2 UNTUK ORIENTASI UMUM BESERTA BACKGROUND-NYA
        if (item.isGeneralOrientation && item.orientationMaterials && item.orientationMaterials.length > 0) {
          const bgPage2Html = currentTemplate && currentTemplate.background_page2 
            ? `<img src="${currentTemplate.background_page2}" class="back-background" alt="">` 
            : '';

          combinedHtml += `
            <div class="certificate back-page">
                ${bgPage2Html}
                <div class="back-content">
                    <h2 class="back-title">DAFTAR MATERI<br>${item.trainingTitle}</h2>
                    <table class="materials-table">
                        <thead>
                            <tr>
                                <th style="width: 50px;">NO</th>
                                <th>MATERI PELATIHAN</th>
                                <th style="width: 150px;">KETERANGAN</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${item.orientationMaterials.map((materi, index) => `
                                <tr>
                                    <td style="text-align: center;">${index + 1}</td>
                                    <td>${materi}</td>
                                    <td style="text-align: center;">Lulus</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
          `;
        }
      });

      combinedHtml += `</body></html>`;

      const iframe = document.createElement("iframe");
      iframe.style.position = 'absolute';
      iframe.style.width = '1px';
      iframe.style.height = '1px';
      iframe.style.left = '-10000px'; 
      iframe.style.border = 'none';
      
      document.body.appendChild(iframe);

      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();

          setTimeout(() => {
            document.body.removeChild(iframe);
            setBulkDownloading(false);
          }, 3000);
        }, 1500); 
      };

      iframe.contentDocument.open();
      iframe.contentDocument.write(combinedHtml);
      iframe.contentDocument.close();
      
    } catch (err) {
      setActionError(err.message || "Gagal mencetak sertifikat batch.");
      setBulkDownloading(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setActionError("");
    try {
      await trainingHistoryService.deleteHistory(
        pendingDelete.training.id,
        pendingDelete.employee.id,
      );
      setPendingDelete(null);
      reload();
    } catch (deleteError) {
      setActionError(
        deleteError.response?.data?.message ||
          "Riwayat pelatihan gagal dihapus.",
      );
    } finally {
      setDeleting(false);
    }
  }

  async function confirmEditDate() {
    if (!pendingEditDate || !newDate || !pendingEditDate.certificate?.id)
      return;
    setUpdatingDate(true);
    setActionError("");

    try {
      const myToken = localStorage.getItem("authToken");
      if (!myToken)
        throw new Error("Sesi login tidak valid. Silakan login ulang.");

      const response = await fetch(
        `https://apidiklat.rsabl.com/api/certificates/${pendingEditDate.certificate.id}/date`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${myToken}`,
          },
          body: JSON.stringify({ new_date: newDate }),
        },
      );

      if (!response.ok) throw new Error("Gagal mengubah tanggal sertifikat.");

      setPendingEditDate(null);
      setNewDate("");
      reload();
    } catch (error) {
      setActionError(error.message || "Terjadi kesalahan sistem.");
    } finally {
      setUpdatingDate(false);
    }
  }

  function closeBulkPreview() {
    if (bulkPreview?.url) {
      URL.revokeObjectURL(bulkPreview.url);
    }
    setBulkPreview(null);
  }

  function downloadBulkPreview() {
    if (!bulkPreview) return;
    const link = document.createElement("a");
    link.href = bulkPreview.url;
    link.setAttribute("download", `Batch_Sertifikat_${Date.now()}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  if (bulkPreview) {
    return (
      <main className="employee-certificate-page">
        <header className="employee-certificate-header">
          <div>
            <h1>Preview Sertifikat</h1>
            <p>
              PDF gabungan berisi <strong>{bulkPreview.count}</strong>{" "}
              sertifikat siap diunduh.
            </p>
          </div>
          <div className="employee-certificate-actions">
            <button type="button" onClick={closeBulkPreview}>
              Batal
            </button>
            <button
              type="button"
              className="employee-certificate-download"
              onClick={downloadBulkPreview}
            >
              Download PDF
            </button>
          </div>
        </header>
        <section className="employee-certificate-stage">
          <iframe
            className="certificate-pdf-preview"
            src={bulkPreview.url}
            title="Preview sertifikat gabungan"
          />
        </section>
      </main>
    );
  }

  return (
    <main className="history-admin-page">
      <header className="history-admin-header">
        <div>
          <h1>{historyData?.title || "Riwayat Pelatihan"}</h1>
          <p>
            {historyData?.message ||
              "Riwayat pelatihan karyawan yang telah selesai."}
          </p>
        </div>
      </header>

      <div className="history-toolbar">
        <label className="history-filter">
          <span>Filter Pelatihan</span>
          <select
            value={selectedTrainingId}
            onChange={(event) => selectTraining(event.target.value)}
          >
            <option value="all">Semua pelatihan</option>
            {trainingOptions.map((training) => (
              <option key={training.id} value={training.id}>
                {training.title}
              </option>
            ))}
          </select>
        </label>
        <label className="history-admin-search">
          <span>Cari riwayat</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nama atau username..."
          />
        </label>
        <button
          type="button"
          className="history-download-all"
          onClick={printFilteredCertificates}
          disabled={
            certificatesLoading ||
            bulkDownloading ||
            availableCertificates.length === 0 
          }
        >
          {certificatesLoading || bulkDownloading
            ? "Memuat PDF..."
            : `Download Semua PDF (${availableCertificates.length})`}
        </button>
      </div>

      {loading && <p className="history-admin-state">Memuat riwayat...</p>}
      {error && (
        <p className="history-admin-state history-admin-error">
          Riwayat gagal dimuat.
        </p>
      )}
      {actionError && (
        <p className="history-admin-alert" role="alert">
          {actionError}
        </p>
      )}

      {!loading && !error && (
        <div className="history-admin-table-wrap">
          <table className="history-admin-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Peserta</th>
                <th>Pelatihan</th>
                <th>Selesai</th>
                <th>Status</th>
                <th>Sertifikat</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="history-admin-empty">
                    Riwayat tidak ditemukan.
                  </td>
                </tr>
              ) : (
                filtered.map((history, index) => (
                  <tr key={`${history.employee.id}-${history.training.id}`}>
                    <td data-label="No">{index + 1}</td>
                    <td data-label="Peserta">
                      <strong>{history.employee.name}</strong>
                      <small>{history.employee.employee_number}</small>
                    </td>
                    <td data-label="Pelatihan">{history.training.title}</td>
                    <td data-label="Selesai">
                      {new Date(history.result.finished_at).toLocaleDateString(
                        "id-ID",
                      )}
                    </td>
                    <td data-label="Status">
                      {history.result.status} ({history.result.score})
                    </td>
                    <td data-label="Sertifikat">
                      {history.certificate ? "Tersedia" : "Tidak tersedia"}
                    </td>
                    <td data-label="Aksi">
                      <div
                        className="history-actions"
                        style={{
                          display: "flex",
                          gap: "6px",
                          flexWrap: "wrap",
                        }}
                      >
                        {history.certificate && (
                          <>
                            <button
                              type="button"
                              className="history-view"
                              onClick={() =>
                                navigate({
                                  pathname: `/${role}/certificates/${history.certificate.id}`,
                                  search: searchParams.toString()
                                    ? `?${searchParams.toString()}`
                                    : "",
                                })
                              }
                            >
                              Lihat
                            </button>

                            <button
                              type="button"
                              style={{
                                backgroundColor: "#f59e0b",
                                color: "white",
                                border: "none",
                                padding: "4px 8px",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "12px",
                              }}
                              onClick={() => {
                                setPendingEditDate(history);
                                const currentDate = history.result?.finished_at
                                  ? new Date(history.result.finished_at)
                                      .toISOString()
                                      .split("T")[0]
                                  : new Date().toISOString().split("T")[0];
                                setNewDate(currentDate);
                              }}
                            >
                              Edit Tgl
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          className="history-delete"
                          onClick={() => setPendingDelete(history)}
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <button
        type="button"
        className="history-back"
        onClick={() => navigate(-1)}
      >
        Back
      </button>

      {pendingEditDate && (
        <div
          className="history-dialog-backdrop"
          role="presentation"
          onMouseDown={() => !updatingDate && setPendingEditDate(null)}
        >
          <section
            className="history-dialog"
            role="dialog"
            aria-modal="true"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2>Edit Tanggal Sertifikat</h2>
            <p>
              Ubah tanggal kelulusan/sertifikat untuk peserta{" "}
              <strong>{pendingEditDate.employee?.name}</strong> pada pelatihan{" "}
              <strong>{pendingEditDate.training?.title}</strong>.
            </p>

            <div
              style={{
                margin: "20px 0",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <label
                htmlFor="certificateDateInput"
                style={{ fontWeight: "bold", fontSize: "14px" }}
              >
                Tanggal Baru:
              </label>
              <input
                id="certificateDateInput"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                style={{
                  padding: "8px",
                  borderRadius: "4px",
                  border: "1px solid #ccc",
                  fontSize: "14px",
                }}
              />
            </div>

            <div className="history-dialog-actions">
              <button
                type="button"
                onClick={() => setPendingEditDate(null)}
                disabled={updatingDate}
              >
                Batal
              </button>
              <button
                type="button"
                style={{
                  backgroundColor: "#f59e0b",
                  color: "white",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
                onClick={confirmEditDate}
                disabled={updatingDate || !newDate}
              >
                {updatingDate ? "Menyimpan..." : "Simpan Tanggal"}
              </button>
            </div>
          </section>
        </div>
      )}

      {pendingDelete && (
        <div
          className="history-dialog-backdrop"
          role="presentation"
          onMouseDown={() => !deleting && setPendingDelete(null)}
        >
          <section
            className="history-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-history-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2 id="delete-history-title">Hapus riwayat pelatihan?</h2>
            <p>
              Riwayat <strong>{pendingDelete.training.title}</strong> milik{" "}
              <strong>{pendingDelete.employee.name}</strong> akan dihapus
              permanen, termasuk hasil ujian, progres materi, dan sertifikat.
              Peserta dapat mengikuti pelatihan ini kembali dari awal.
            </p>
            <div className="history-dialog-actions">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                disabled={deleting}
              >
                Batal
              </button>
              <button
                type="button"
                className="history-delete-confirm"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? "Menghapus..." : "Hapus Permanen"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default TrainingHistoryDashboard;