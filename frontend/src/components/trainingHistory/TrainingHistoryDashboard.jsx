import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import * as certificateService from "../../services/certificateService";
import * as trainingHistoryService from "../../services/trainingHistoryService";
import { createCertificatePdfBlob } from "../../utils/downloadCertificateAsPng";
import Certificate from "../certificate/Certificate";
import "../certificate/CertificateDashboard.css";
import "../../pages/employee/EmployeeCertificatePage.css";
import "./TrainingHistoryDashboard.css";

function TrainingHistoryDashboard({ historyData, certificateData, certificatesLoading, loading, error, reload, role }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  
  // State baru untuk fitur Edit Tanggal
  const [pendingEditDate, setPendingEditDate] = useState(null);
  const [newDate, setNewDate] = useState("");
  const [updatingDate, setUpdatingDate] = useState(false);

  const [actionError, setActionError] = useState("");
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [bulkPreview, setBulkPreview] = useState(null);
  
  const histories = useMemo(() => historyData?.histories ?? [], [historyData?.histories]);
  const certificates = useMemo(() => certificateData?.certificates ?? [], [certificateData?.certificates]);
  
  const trainingOptions = useMemo(() => {
    const options = new Map();
    histories.forEach((history) => options.set(String(history.training.id), history.training.title));
    return [...options.entries()]
      .map(([id, title]) => ({ id, title }))
      .sort((a, b) => a.title.localeCompare(b.title, "id-ID"));
  }, [histories]);
  
  const requestedTrainingId = searchParams.get("training") || "all";
  const selectedTrainingId = requestedTrainingId === "all" || trainingOptions.some(
    (training) => training.id === requestedTrainingId
  ) ? requestedTrainingId : "all";

  function selectTraining(trainingId) {
    const nextParams = new URLSearchParams(searchParams);
    if (trainingId === "all") {
      nextParams.delete("training");
    } else {
      nextParams.set("training", trainingId);
    }
    setSearchParams(nextParams, { replace: true });
  }

  const filteredCertificates = useMemo(() => certificates.filter((certificate) =>
    selectedTrainingId === "all" || String(certificate.training?.id) === selectedTrainingId
  ), [certificates, selectedTrainingId]);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return histories.filter((history) => {
      if (selectedTrainingId !== "all" && String(history.training.id) !== selectedTrainingId) {
        return false;
      }
      if (!keyword) return true;
      return [history.employee?.name, history.employee?.employee_number, history.training?.title]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    });
  }, [histories, query, selectedTrainingId]);

  useEffect(() => () => {
    if (bulkPreview?.url) {
      URL.revokeObjectURL(bulkPreview.url);
    }
  }, [bulkPreview?.url]);

  async function printFilteredCertificates() {
    if (filteredCertificates.length === 0) {
      setActionError("Tidak ada sertifikat pada pelatihan yang dipilih.");
      return;
    }

    setActionError("");
    setBulkDownloading(true);

    try {
      const file = await createCertificatePdfBlob(filteredCertificates);
      const url = URL.createObjectURL(file.blob);
      setBulkPreview({ ...file, url });
    } catch (downloadError) {
      setActionError(downloadError.message || "Sertifikat gabungan gagal dibuat.");
    } finally {
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
        pendingDelete.employee.id
      );
      setPendingDelete(null);
      reload();
    } catch (deleteError) {
      setActionError(
        deleteError.response?.data?.message || "Riwayat pelatihan gagal dihapus."
      );
    } finally {
      setDeleting(false);
    }
  }

  // Fungsi untuk mengeksekusi penyimpanan tanggal baru ke Backend
  async function confirmEditDate() {
    if (!pendingEditDate || !newDate || !pendingEditDate.certificate?.id) return;
    setUpdatingDate(true);
    setActionError("");
    
    try {
      // 1. Ambil token secara dinamis dari Local Storage
      const myToken = localStorage.getItem('authToken'); 

      // 2. Pastikan token ada sebelum melakukan request
      if (!myToken) {
         throw new Error("Sesi login tidak valid. Silakan login ulang.");
      }

      // 3. Kirim request dengan token yang sudah terambil otomatis
      const response = await fetch(`https://apidiklat.rsabl.com/api/certificates/${pendingEditDate.certificate.id}/date`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${myToken}` // Token disisipkan di sini
        },
        body: JSON.stringify({ new_date: newDate })
      });

      if (!response.ok) {
          throw new Error("Gagal mengubah tanggal sertifikat.");
      }

      setPendingEditDate(null);
      setNewDate("");
      reload(); // Refresh data tabel
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
    certificateService.saveCertificateBlob(bulkPreview);
  }

  if (bulkPreview) {
    return (
      <main className="employee-certificate-page">
        <header className="employee-certificate-header">
          <div>
            <h1>Preview Sertifikat</h1>
            <p>PDF gabungan berisi {bulkPreview.count} sertifikat, {bulkPreview.pageCount} halaman.</p>
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
          <p>{historyData?.message || "Riwayat pelatihan karyawan yang telah selesai."}</p>
        </div>
      </header>

      <div className="history-toolbar">
        <label className="history-filter">
          <span>Filter Pelatihan</span>
          <select value={selectedTrainingId} onChange={(event) => selectTraining(event.target.value)}>
            <option value="all">Semua pelatihan</option>
            {trainingOptions.map((training) => <option key={training.id} value={training.id}>{training.title}</option>)}
          </select>
        </label>
        <label className="history-admin-search">
          <span>Cari riwayat</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nama atau username..." />
        </label>
        <button type="button" className="history-download-all" onClick={printFilteredCertificates} disabled={certificatesLoading || bulkDownloading || filteredCertificates.length === 0}>
          {certificatesLoading || bulkDownloading ? "Memuat..." : `Download Semua PDF (${filteredCertificates.length})`}
        </button>
      </div>

      {loading && <p className="history-admin-state">Memuat riwayat...</p>}
      {error && <p className="history-admin-state history-admin-error">Riwayat gagal dimuat.</p>}
      {actionError && <p className="history-admin-alert" role="alert">{actionError}</p>}

      {!loading && !error && (
        <div className="history-admin-table-wrap">
          <table className="history-admin-table">
            <thead><tr><th>No</th><th>Peserta</th><th>Pelatihan</th><th>Selesai</th><th>Status</th><th>Sertifikat</th><th>Aksi</th></tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="7" className="history-admin-empty">Riwayat tidak ditemukan.</td></tr>
              ) : filtered.map((history, index) => (
                <tr key={`${history.employee.id}-${history.training.id}`}>
                  <td data-label="No">{index + 1}</td>
                  <td data-label="Peserta"><strong>{history.employee.name}</strong><small>{history.employee.employee_number}</small></td>
                  <td data-label="Pelatihan">{history.training.title}</td>
                  <td data-label="Selesai">{new Date(history.result.finished_at).toLocaleDateString("id-ID")}</td>
                  <td data-label="Status">{history.result.status} ({history.result.score})</td>
                  <td data-label="Sertifikat">{history.certificate ? "Tersedia" : "Tidak tersedia"}</td>
                  <td data-label="Aksi">
                    <div className="history-actions" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {history.certificate && (
                        <>
                          <button
                            type="button"
                            className="history-view"
                            onClick={() => navigate({
                              pathname: `/${role}/certificates/${history.certificate.id}`,
                              search: searchParams.toString() ? `?${searchParams.toString()}` : "",
                            })}
                          >
                            Lihat
                          </button>

                          {/* Tombol Edit Tanggal */}
                          <button
                            type="button"
                            style={{ backgroundColor: '#f59e0b', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                            onClick={() => {
                              setPendingEditDate(history);
                              const currentDate = history.result?.finished_at 
                                ? new Date(history.result.finished_at).toISOString().split('T')[0] 
                                : new Date().toISOString().split('T')[0];
                              setNewDate(currentDate);
                            }}
                          >
                            Edit Tgl
                          </button>
                        </>
                      )}
                      <button type="button" className="history-delete" onClick={() => setPendingDelete(history)}>Hapus</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button type="button" className="history-back" onClick={() => navigate(-1)}>Back</button>

      {/* Modal Dialog Edit Tanggal */}
      {pendingEditDate && (
        <div className="history-dialog-backdrop" role="presentation" onMouseDown={() => !updatingDate && setPendingEditDate(null)}>
          <section className="history-dialog" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <h2>Edit Tanggal Sertifikat</h2>
            <p>Ubah tanggal kelulusan/sertifikat untuk peserta <strong>{pendingEditDate.employee?.name}</strong> pada pelatihan <strong>{pendingEditDate.training?.title}</strong>.</p>
            
            <div style={{ margin: "20px 0", display: "flex", flexDirection: "column", gap: "8px" }}>
              <label htmlFor="certificateDateInput" style={{ fontWeight: "bold", fontSize: "14px" }}>Tanggal Baru:</label>
              <input 
                id="certificateDateInput"
                type="date" 
                value={newDate} 
                onChange={(e) => setNewDate(e.target.value)}
                style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc", fontSize: "14px" }}
              />
            </div>

            <div className="history-dialog-actions">
              <button type="button" onClick={() => setPendingEditDate(null)} disabled={updatingDate}>Batal</button>
              <button 
                type="button" 
                style={{ backgroundColor: '#f59e0b', color: '#white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }} 
                onClick={confirmEditDate} 
                disabled={updatingDate || !newDate}
              >
                {updatingDate ? "Menyimpan..." : "Simpan Tanggal"}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Modal Dialog Hapus Riwayat */}
      {pendingDelete && (
        <div className="history-dialog-backdrop" role="presentation" onMouseDown={() => !deleting && setPendingDelete(null)}>
          <section className="history-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-history-title" onMouseDown={(event) => event.stopPropagation()}>
            <h2 id="delete-history-title">Hapus riwayat pelatihan?</h2>
            <p>Riwayat <strong>{pendingDelete.training.title}</strong> milik <strong>{pendingDelete.employee.name}</strong> akan dihapus permanen, termasuk hasil ujian, progres materi, dan sertifikat. Peserta dapat mengikuti pelatihan ini kembali dari awal.</p>
            <div className="history-dialog-actions">
              <button type="button" onClick={() => setPendingDelete(null)} disabled={deleting}>Batal</button>
              <button type="button" className="history-delete-confirm" onClick={confirmDelete} disabled={deleting}>{deleting ? "Menghapus..." : "Hapus Permanen"}</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default TrainingHistoryDashboard;