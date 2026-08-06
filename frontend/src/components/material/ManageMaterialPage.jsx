import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "../dashboard/DashboardLayout";
import MaterialTable from "./MaterialTable";
import MaterialForm from "./MaterialForm";
import UploadMaterialDialog from "./UploadMaterialDialog";
import MaterialConfirmDialog from "./MaterialConfirmDialog";
import EditMaterialDialog from "./EditMaterialDialog";
import { useMaterials } from "../../hooks/useMaterials";
import * as materialService from "../../services/materialService";
import * as trainingService from "../../services/trainingService";
import listIcon from "../../assets/icons/icon-daftar-materi.svg";
import addIcon from "../../assets/icons/icon-tambahmateri.svg";
import "./ManageMaterialPage.css";

const createSelectionId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

const CERTIFICATE_EDITOR_WIDTH = 841;
const CERTIFICATE_EDITOR_HEIGHT = 595;
const certificateTemplateFields = [
  { key: "certificate_number", label: "No Sertifikat", sample: "NO: 001/DIKLATLIT-RSABL/VIII/2026" },
  { key: "employee_name", label: "Nama Peserta", sample: "Nama Peserta" },
  { key: "training_title", label: "Judul Pelatihan", sample: "Judul Pelatihan" },
  { key: "completion_date", label: "Tanggal", sample: "Bandar Lampung, 3 Agustus 2026" },
];
const certificateTemplateFontOptions = [
  { value: "sans", label: "Poppins", css: '"Poppins", sans-serif' },
  { value: "montserrat", label: "Montserrat", css: '"Montserrat", sans-serif' },
  { value: "serif", label: "Playfair", css: '"Playfair Display", Georgia, serif' },
  { value: "merriweather", label: "Merriweather", css: '"Merriweather", Georgia, serif' },
  { value: "lora", label: "Lora", css: '"Lora", Georgia, serif' },
  { value: "cinzel", label: "Cinzel", css: '"Cinzel", Georgia, serif' },
  { value: "cormorant", label: "Cormorant", css: '"Cormorant Garamond", Georgia, serif' },
  { value: "script", label: "Great Vibes", css: '"Great Vibes", "Brush Script MT", cursive' },
  { value: "dancing", label: "Dancing Script", css: '"Dancing Script", "Brush Script MT", cursive' },
  { value: "allura", label: "Allura", css: '"Allura", "Brush Script MT", cursive' },
  { value: "pacifico", label: "Pacifico", css: '"Pacifico", "Brush Script MT", cursive' },
];
const defaultCertificateTemplateSettings = {
  fields: {
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
  },
};
const editorFontFamilies = Object.fromEntries(
  certificateTemplateFontOptions.map((font) => [font.value, font.css])
);

const mergeCertificateTemplateSettings = (settings) => ({
  fields: Object.fromEntries(
    certificateTemplateFields.map((field) => [
      field.key,
      {
        ...defaultCertificateTemplateSettings.fields[field.key],
        ...(settings?.fields?.[field.key] ?? {}),
      },
    ])
  ),
});

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function ManageMaterialPage({ role }) {
  const navigate = useNavigate();
  const { trainingId } = useParams();
  const rolePath = role === "superadmin" ? "superadmin" : "admin";
  const [trainings, setTrainings] = useState([]);
  const [trainingLoading, setTrainingLoading] = useState(true);
  const [trainingError, setTrainingError] = useState("");
  const [newTrainingTitle, setNewTrainingTitle] = useState("");
  const [newTrainingAccessCode, setNewTrainingAccessCode] = useState("");
  const [newTrainingActive, setNewTrainingActive] = useState(true);
  const [addingTraining, setAddingTraining] = useState(false);
  const [trainingFormError, setTrainingFormError] = useState("");
  const [editingTraining, setEditingTraining] = useState(null);
  const [editTrainingTitle, setEditTrainingTitle] = useState("");
  const [editTrainingAccessCode, setEditTrainingAccessCode] = useState("");
  const [editTrainingOriginalAccessCode, setEditTrainingOriginalAccessCode] = useState("");
  const [editTrainingActive, setEditTrainingActive] = useState(true);
  const [clearTrainingAccessCode, setClearTrainingAccessCode] = useState(false);
  const [editTrainingError, setEditTrainingError] = useState("");
  const [editTrainingLoading, setEditTrainingLoading] = useState(false);
  const [deletingTraining, setDeletingTraining] = useState(null);
  const [deletingTrainingLoading, setDeletingTrainingLoading] = useState(false);
  const selectedTraining = trainings.find((training) => String(training.id) === String(trainingId));
  const isGeneralOrientation = Boolean(selectedTraining?.is_general_orientation);
  const {
    materials,
    loading,
    loadMaterials,
    addMaterial,
    updateMaterial,
    deleteMaterial,
  } = useMaterials(trainingId);
  const [addFileName, setAddFileName] = useState("");
  const [addFiles, setAddFiles] = useState([]);
  const [addResetSignal, setAddResetSignal] = useState(0);
  const [pendingAdd, setPendingAdd] = useState(null);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [editFileName, setEditFileName] = useState(undefined);
  const [editFile, setEditFile] = useState(null);
  const [pendingEdit, setPendingEdit] = useState(null);
  const [deletingMaterialId, setDeletingMaterialId] = useState(null);
  const [uploadTarget, setUploadTarget] = useState(null);
  const [certificateTemplateFile, setCertificateTemplateFile] = useState(null);
  const [certificateTemplateLoading, setCertificateTemplateLoading] = useState(false);
  const [certificateTemplateDraft, setCertificateTemplateDraft] = useState(
    defaultCertificateTemplateSettings
  );
  const [selectedCertificateField, setSelectedCertificateField] = useState("employee_name");
  const [draggingCertificateField, setDraggingCertificateField] = useState(null);
  const [certificateEditorScale, setCertificateEditorScale] = useState(1);
  const certificateEditorRef = useRef(null);
  const [toast, setToast] = useState("");

  const loadTrainings = useCallback(async () => {
    setTrainingLoading(true);
    try {
      const data = await trainingService.getTrainings();
      setTrainings(data);
      setTrainingError("");
    } catch {
      setTrainingError("Daftar pelatihan gagal dimuat.");
    } finally {
      setTrainingLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    Promise.resolve().then(() => {
      if (active) loadTrainings();
    });

    return () => {
      active = false;
    };
  }, [loadTrainings]);

  useEffect(() => {
    if (trainingId) loadMaterials();
  }, [trainingId, loadMaterials]);

  useEffect(() => {
    if (!toast) return undefined;

    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    let active = true;

    Promise.resolve().then(() => {
      if (!active) return;
      setCertificateTemplateDraft(
        mergeCertificateTemplateSettings(selectedTraining?.certificate_template?.settings)
      );
      setSelectedCertificateField("employee_name");
      setCertificateTemplateFile(null);
    });

    return () => {
      active = false;
    };
  }, [selectedTraining?.id, selectedTraining?.certificate_template?.settings]);

  useEffect(() => {
    const editor = certificateEditorRef.current;
    if (!editor) return undefined;

    const updateScale = () => {
      setCertificateEditorScale(editor.clientWidth / CERTIFICATE_EDITOR_WIDTH);
    };

    updateScale();

    if (typeof ResizeObserver !== "function") {
      window.addEventListener("resize", updateScale);
      return () => window.removeEventListener("resize", updateScale);
    }

    const observer = new ResizeObserver(updateScale);
    observer.observe(editor);
    return () => observer.disconnect();
  }, [selectedTraining?.certificate_template?.background_url]);

  function openEdit(material) {
    setEditingMaterial(material);
    setEditFileName(material.fileName);
    setEditFile(null);
  }

  function openTrainingEdit(training) {
    setEditingTraining(training);
    setEditTrainingTitle(training.title ?? "");
    setEditTrainingAccessCode(training.post_test_access_code ?? "");
    setEditTrainingOriginalAccessCode(training.post_test_access_code ?? "");
    setEditTrainingActive(Boolean(training.is_active ?? true));
    setClearTrainingAccessCode(false);
    setEditTrainingError("");
  }

  function closeTrainingEdit() {
    setEditingTraining(null);
    setEditTrainingTitle("");
    setEditTrainingAccessCode("");
    setEditTrainingOriginalAccessCode("");
    setEditTrainingActive(true);
    setClearTrainingAccessCode(false);
    setEditTrainingError("");
    setEditTrainingLoading(false);
  }

  function closeEdit() {
    setEditingMaterial(null);
    setEditFileName(undefined);
    setEditFile(null);
    setPendingEdit(null);
  }

  function handleUploadSelect(file) {
    if (uploadTarget === "add") {
      const files = (Array.isArray(file) ? file : [file]).map((selected) => ({
        ...selected,
        id: createSelectionId(),
        title: "",
      }));
      setAddFileName(files.length === 1 ? files[0].fileName : `${files.length} file dipilih`);
      setAddFiles(files);
    }

    if (uploadTarget === "edit") {
      setEditFileName(file.fileName);
      setEditFile(file);
    }

    setUploadTarget(null);
  }

  function handleAddFilesChange(files) {
    setAddFiles(files);
    setAddFileName(
      files.length === 0
        ? ""
        : files.length === 1
          ? files[0].fileName
          : `${files.length} file dipilih`
    );
  }

  function openMaterialFile(material) {
    const file = material.files && material.files[0];
    if (!file) {
      setToast("File materi belum tersedia untuk dibuka.");
      return;
    }

    materialService
      .openMaterialFile(material, file)
      .catch(() => setToast("File materi gagal dibuka."));
  }

  async function handleCreateTraining(event) {
    event.preventDefault();

    const title = newTrainingTitle.trim();
    if (!title) {
      setTrainingFormError("Nama pelatihan wajib diisi.");
      return;
    }

    setAddingTraining(true);
    setTrainingFormError("");

    try {
      const training = await trainingService.createTraining({
        title,
        post_test_access_code: newTrainingAccessCode.trim(),
        is_active: newTrainingActive,
      });
      setTrainings((current) => [...current, training]);
      setNewTrainingTitle("");
      setNewTrainingAccessCode("");
      setNewTrainingActive(true);
      setToast("Pelatihan berhasil ditambahkan.");
    } catch (error) {
      const message =
        error.response?.data?.message ||
        Object.values(error.response?.data?.errors ?? {}).flat()[0] ||
        "Pelatihan gagal ditambahkan.";
      setTrainingFormError(message);
    } finally {
      setAddingTraining(false);
    }
  }

  async function confirmDeleteTraining() {
    if (!deletingTraining) return;

    setDeletingTrainingLoading(true);

    try {
      await trainingService.deleteTraining(deletingTraining.id);
      setTrainings((current) =>
        current.filter((training) => String(training.id) !== String(deletingTraining.id))
      );
      setDeletingTraining(null);
      setToast("Pelatihan berhasil dihapus.");
    } catch (error) {
      const message =
        error.response?.data?.message ||
        Object.values(error.response?.data?.errors ?? {}).flat()[0] ||
        "Pelatihan gagal dihapus.";
      setToast(message);
    } finally {
      setDeletingTrainingLoading(false);
    }
  }

  async function handleUpdateTraining(event) {
    event.preventDefault();

    if (!editingTraining) return;

    const title = editTrainingTitle.trim();
    if (!title) {
      setEditTrainingError("Nama pelatihan wajib diisi.");
      return;
    }

    setEditTrainingLoading(true);
    setEditTrainingError("");

    try {
      const updatedTraining = await trainingService.updateTraining(editingTraining.id, {
        title,
        is_active: editTrainingActive,
        ...(editTrainingAccessCode.trim() && !clearTrainingAccessCode
          ? { post_test_access_code: editTrainingAccessCode.trim() }
          : {}),
        clear_post_test_access_code: clearTrainingAccessCode,
      });
      setTrainings((current) =>
        current.map((training) =>
          String(training.id) === String(updatedTraining.id) ? updatedTraining : training
        )
      );
      closeTrainingEdit();
      setToast("Pelatihan berhasil diperbarui.");
    } catch (error) {
      const message =
        error.response?.data?.message ||
        Object.values(error.response?.data?.errors ?? {}).flat()[0] ||
        "Pelatihan gagal diperbarui.";
      setEditTrainingError(message);
    } finally {
      setEditTrainingLoading(false);
    }
  }

  async function handleUploadCertificateTemplate(event) {
    event.preventDefault();

    if (!trainingId || !certificateTemplateFile) {
      setToast("Pilih file template sertifikat terlebih dahulu.");
      return;
    }

    setCertificateTemplateLoading(true);

    try {
      const updatedTraining = await trainingService.uploadCertificateTemplate(
        trainingId,
        certificateTemplateFile
      );
      setTrainings((current) =>
        current.map((training) =>
          String(training.id) === String(updatedTraining.id) ? updatedTraining : training
        )
      );
      setCertificateTemplateFile(null);
      setToast("Template sertifikat berhasil disimpan.");
    } catch (error) {
      const message =
        error.response?.data?.message ||
        Object.values(error.response?.data?.errors ?? {}).flat()[0] ||
        "Template sertifikat gagal disimpan.";
      setToast(message);
    } finally {
      setCertificateTemplateLoading(false);
    }
  }

  async function handleDeleteCertificateTemplate() {
    if (!trainingId) return;

    setCertificateTemplateLoading(true);

    try {
      const updatedTraining = await trainingService.deleteCertificateTemplate(trainingId);
      setTrainings((current) =>
        current.map((training) =>
          String(training.id) === String(updatedTraining.id) ? updatedTraining : training
        )
      );
      setCertificateTemplateFile(null);
      setToast("Template sertifikat berhasil dihapus.");
    } catch (error) {
      const message =
        error.response?.data?.message ||
        Object.values(error.response?.data?.errors ?? {}).flat()[0] ||
        "Template sertifikat gagal dihapus.";
      setToast(message);
    } finally {
      setCertificateTemplateLoading(false);
    }
  }

  async function handleSaveCertificateTemplateSettings() {
    if (!trainingId) return;

    setCertificateTemplateLoading(true);

    try {
      const updatedTraining = await trainingService.updateCertificateTemplateSettings(
        trainingId,
        certificateTemplateDraft
      );
      setTrainings((current) =>
        current.map((training) =>
          String(training.id) === String(updatedTraining.id) ? updatedTraining : training
        )
      );
      setToast("Posisi template sertifikat berhasil disimpan.");
    } catch (error) {
      const message =
        error.response?.data?.message ||
        Object.values(error.response?.data?.errors ?? {}).flat()[0] ||
        "Posisi template sertifikat gagal disimpan.";
      setToast(message);
    } finally {
      setCertificateTemplateLoading(false);
    }
  }

  function updateCertificateTemplateField(fieldKey, updates) {
    setCertificateTemplateDraft((current) => ({
      fields: {
        ...current.fields,
        [fieldKey]: {
          ...current.fields[fieldKey],
          ...updates,
        },
      },
    }));
  }

  function certificateEditorPoint(event) {
    const editor = certificateEditorRef.current;
    if (!editor) return null;

    const rect = editor.getBoundingClientRect();
    const scale = rect.width / CERTIFICATE_EDITOR_WIDTH;

    return {
      x: (event.clientX - rect.left) / scale,
      y: (event.clientY - rect.top) / scale,
    };
  }

  function handleCertificateFieldPointerDown(event, fieldKey) {
    const point = certificateEditorPoint(event);
    const field = certificateTemplateDraft.fields[fieldKey];

    if (!point || !field) return;

    event.currentTarget.setPointerCapture?.(event.pointerId);
    setSelectedCertificateField(fieldKey);
    setDraggingCertificateField({
      fieldKey,
      offsetX: point.x - field.x,
      offsetY: point.y - field.y,
    });
  }

  function handleCertificateEditorPointerMove(event) {
    if (!draggingCertificateField) return;

    const point = certificateEditorPoint(event);
    const field = certificateTemplateDraft.fields[draggingCertificateField.fieldKey];

    if (!point || !field) return;

    updateCertificateTemplateField(draggingCertificateField.fieldKey, {
      x: Math.round(clamp(point.x - draggingCertificateField.offsetX, 0, CERTIFICATE_EDITOR_WIDTH - field.width)),
      y: Math.round(clamp(point.y - draggingCertificateField.offsetY, 0, CERTIFICATE_EDITOR_HEIGHT - field.fontSize)),
    });
  }

  function handleCertificateEditorPointerUp() {
    setDraggingCertificateField(null);
  }

  function certificateEditorFieldStyle(fieldKey) {
    const field = certificateTemplateDraft.fields[fieldKey];

    return {
      left: `${field.x * certificateEditorScale}px`,
      top: `${field.y * certificateEditorScale}px`,
      width: `${field.width * certificateEditorScale}px`,
      color: field.color,
      fontSize: `${field.fontSize * certificateEditorScale}px`,
      fontFamily: editorFontFamilies[field.fontFamily] ?? editorFontFamilies.sans,
      fontWeight: field.fontWeight,
      textAlign: field.align,
    };
  }

  async function confirmAdd() {
    if (!pendingAdd) return;

    const result = await addMaterial(pendingAdd);
    if (result.success) {
      setPendingAdd(null);
      setAddFileName("");
      setAddFiles([]);
      setAddResetSignal((current) => current + 1);
      setToast(pendingAdd.items?.length > 1 ? "Semua materi berhasil ditambahkan." : "Materi berhasil ditambahkan.");
    } else {
      setToast(result.message);
    }
  }

  async function confirmEdit() {
    if (!pendingEdit) return;

    const result = await updateMaterial(pendingEdit.id, pendingEdit);
    if (result.success) {
      closeEdit();
      setToast("Materi berhasil diperbarui.");
    } else {
      setToast(result.message);
    }
  }

  async function confirmDelete() {
    if (!deletingMaterialId) return;

    const result = await deleteMaterial(deletingMaterialId);
    if (result.success) {
      setDeletingMaterialId(null);
      setToast("Materi berhasil dihapus.");
    } else {
      setToast(result.message);
    }
  }

  return (
    <DashboardLayout role={role}>
      <div className="manage-material-page">
        {!trainingId && (
          <>
            <section className="manage-material-card">
              <div className="manage-material-header">
                <img src={listIcon} alt="" className="manage-material-header-icon" />
                <h1 className="manage-material-title">Daftar Pelatihan</h1>
              </div>

              {trainingLoading && <p className="manage-material-state">Memuat pelatihan...</p>}
              {trainingError && (
                <p className="manage-material-state manage-material-error" role="alert">
                  {trainingError}
                </p>
              )}
              {!trainingLoading && !trainingError && (
                <div className="material-table-wrap">
                  <table className="material-table">
                    <thead>
                      <tr>
                        <th>No</th>
                        <th>Daftar Pelatihan</th>
                        <th>Status</th>
                        <th>Kode Post-Test</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trainings.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="material-table-empty">
                            Belum ada pelatihan.
                          </td>
                        </tr>
                      ) : (
                        trainings.map((training, index) => (
                          <tr key={training.id}>
                            <td data-label="No">{index + 1}</td>
                            <td data-label="Daftar Pelatihan">{training.title}</td>
                            <td data-label="Status">
                              <span className={`manage-training-status ${training.is_active ? "is-active" : "is-inactive"}`}>
                                {training.is_active ? "Aktif" : "Nonaktif"}
                              </span>
                            </td>
                            <td data-label="Kode Post-Test">
                              {training.post_test_access_code || (training.has_post_test_access_code ? "Aktif" : "Belum diatur")}
                            </td>
                            <td data-label="Aksi">
                              <div className="material-table-actions">
                                <button
                                  type="button"
                                  className="material-action material-action-open"
                                  onClick={() => navigate(`/${rolePath}/manage-materi/${training.id}`)}
                                >
                                  Lihat Materi
                                </button>
                                <button
                                  type="button"
                                  className="material-action material-action-edit"
                                  onClick={() => openTrainingEdit(training)}
                                >
                                  Edit
                                </button>
                                {!training.is_general_orientation && (
                                  <button
                                    type="button"
                                    className="material-action material-action-delete"
                                    onClick={() => setDeletingTraining(training)}
                                  >
                                    Hapus
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="manage-material-card">
              <div className="manage-material-header">
                <img src={listIcon} alt="" className="manage-material-header-icon" />
                <h2 className="manage-material-title">Tambah Pelatihan</h2>
              </div>

              <form className="manage-training-form" onSubmit={handleCreateTraining}>
                <div className="manage-training-field">
                  <label htmlFor="new-training-title">Nama Pelatihan</label>
                  <input
                    id="new-training-title"
                    value={newTrainingTitle}
                    onChange={(event) => {
                      setNewTrainingTitle(event.target.value);
                      setTrainingFormError("");
                    }}
                    disabled={addingTraining}
                  />
                  {trainingFormError && (
                    <span className="manage-training-error" role="alert">
                      {trainingFormError}
                    </span>
                  )}
                </div>

                <div className="manage-training-field">
                  <label htmlFor="new-training-access-code">Kode Post-Test</label>
                  <input
                    id="new-training-access-code"
                    value={newTrainingAccessCode}
                    onChange={(event) => setNewTrainingAccessCode(event.target.value)}
                    disabled={addingTraining}
                  />
                </div>

                <label className="manage-training-toggle">
                  <input
                    type="checkbox"
                    checked={newTrainingActive}
                    onChange={(event) => setNewTrainingActive(event.target.checked)}
                    disabled={addingTraining}
                  />
                  Pelatihan aktif
                </label>

                <button
                  type="submit"
                  className="manage-training-submit"
                  disabled={addingTraining}
                >
                  {addingTraining ? "Menambahkan..." : "+ Tambah Pelatihan"}
                </button>
              </form>
            </section>

            <section className="manage-material-card">
              <div className="manage-material-header">
                <img src={addIcon} alt="" className="manage-material-header-icon" />
                <h2 className="manage-material-title">Tambah Materi</h2>
              </div>

              <MaterialForm
                mode="add"
                onSubmit={setPendingAdd}
                onOpenUpload={() => setUploadTarget("add")}
                selectedFileName={addFileName}
                selectedFiles={addFiles}
                onSelectedFilesChange={handleAddFilesChange}
                resetSignal={addResetSignal}
                loading={loading}
                trainings={trainings}
              />
            </section>
          </>
        )}

        {trainingId && (
          <>
        <section className="manage-material-card">
          <div className="manage-material-header">
            <img src={listIcon} alt="" className="manage-material-header-icon" />
            <div>
              <h1 className="manage-material-title">Daftar Materi</h1>
              <p className="manage-material-training-name">
                Pelatihan: {selectedTraining?.title ?? "Memuat pelatihan..."}
              </p>
            </div>
          </div>

          <MaterialTable
            materials={materials}
            emptyMessage="Belum ada materi pada pelatihan ini."
            onOpen={openMaterialFile}
            onEdit={openEdit}
            onDelete={setDeletingMaterialId}
          />
          <button
            type="button"
            className="manage-material-back"
            onClick={() => navigate(`/${rolePath}/manage-materi`)}
          >
            &larr; Back
          </button>
        </section>

        <section className="manage-material-card">
          <div className="manage-material-header">
            <img src={addIcon} alt="" className="manage-material-header-icon" />
            <div>
              <h1 className="manage-material-title">Template Sertifikat</h1>
              <p className="manage-material-training-name">
                Template untuk pelatihan: {selectedTraining?.title ?? "Memuat pelatihan..."}
              </p>
            </div>
          </div>

          <form className="manage-certificate-template-form" onSubmit={handleUploadCertificateTemplate}>
            {selectedTraining?.certificate_template?.background_url && !isGeneralOrientation && (
              <div
                className="manage-certificate-template-editor"
                ref={certificateEditorRef}
                onPointerMove={handleCertificateEditorPointerMove}
                onPointerUp={handleCertificateEditorPointerUp}
                onPointerLeave={handleCertificateEditorPointerUp}
              >
                <img
                  src={selectedTraining.certificate_template.background_url}
                  alt="Preview template sertifikat"
                />
                {certificateTemplateFields.map((field) => (
                  <button
                    type="button"
                    key={field.key}
                    className={`manage-certificate-template-field-box${
                      selectedCertificateField === field.key ? " is-selected" : ""
                    }`}
                    style={certificateEditorFieldStyle(field.key)}
                    onPointerDown={(event) => handleCertificateFieldPointerDown(event, field.key)}
                  >
                    {field.sample}
                  </button>
                ))}
              </div>
            )}
            {selectedTraining?.certificate_template?.background_url && isGeneralOrientation && (
              <object
                className="manage-certificate-template-pdf"
                data={selectedTraining.certificate_template.background_url}
                type="application/pdf"
                aria-label="Preview template PDF Orientasi Umum"
              >
                <a href={selectedTraining.certificate_template.background_url} target="_blank" rel="noreferrer">
                  Buka template PDF Orientasi Umum
                </a>
              </object>
            )}
            <label className="manage-certificate-template-field" htmlFor="certificate-template-file">
              {isGeneralOrientation
                ? "File template Orientasi Umum (PDF tepat 2 halaman)"
                : "File template sertifikat"}
              <input
                id="certificate-template-file"
                type="file"
                accept={isGeneralOrientation ? "application/pdf" : "image/png,image/jpeg,image/webp"}
                onChange={(event) => setCertificateTemplateFile(event.target.files?.[0] ?? null)}
                disabled={certificateTemplateLoading}
              />
            </label>
            <div className="manage-certificate-template-actions">
              <button
                type="submit"
                className="manage-training-submit"
                disabled={certificateTemplateLoading || !certificateTemplateFile}
              >
                {certificateTemplateLoading ? "Menyimpan..." : "Simpan Template"}
              </button>
              {selectedTraining?.certificate_template?.background_url && (
                <button
                  type="button"
                  className="manage-certificate-template-delete"
                  onClick={handleDeleteCertificateTemplate}
                  disabled={certificateTemplateLoading}
                >
                  Hapus Template
                </button>
              )}
            </div>
          </form>

          {selectedTraining?.certificate_template?.background_url && (
            <div className="manage-certificate-template-settings">
              {isGeneralOrientation && (
                <p className="manage-material-training-name">
                  Posisi berikut berlaku untuk data halaman pertama. Daftar materi halaman kedua dibuat otomatis berdasarkan departemen peserta.
                </p>
              )}
              <label className="manage-certificate-template-setting">
                Field
                <select
                  value={selectedCertificateField}
                  onChange={(event) => setSelectedCertificateField(event.target.value)}
                  disabled={certificateTemplateLoading}
                >
                  {certificateTemplateFields.map((field) => (
                    <option key={field.key} value={field.key}>
                      {field.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="manage-certificate-template-setting">
                X
                <input
                  type="number"
                  min="0"
                  max="841"
                  value={certificateTemplateDraft.fields[selectedCertificateField].x}
                  onChange={(event) =>
                    updateCertificateTemplateField(selectedCertificateField, {
                      x: Number(event.target.value),
                    })
                  }
                />
              </label>
              <label className="manage-certificate-template-setting">
                Y
                <input
                  type="number"
                  min="0"
                  max="595"
                  value={certificateTemplateDraft.fields[selectedCertificateField].y}
                  onChange={(event) =>
                    updateCertificateTemplateField(selectedCertificateField, {
                      y: Number(event.target.value),
                    })
                  }
                />
              </label>
              <label className="manage-certificate-template-setting">
                Lebar
                <input
                  type="number"
                  min="40"
                  max="841"
                  value={certificateTemplateDraft.fields[selectedCertificateField].width}
                  onChange={(event) =>
                    updateCertificateTemplateField(selectedCertificateField, {
                      width: Number(event.target.value),
                    })
                  }
                />
              </label>
              <label className="manage-certificate-template-setting">
                Ukuran
                <input
                  type="number"
                  min="8"
                  max="96"
                  value={certificateTemplateDraft.fields[selectedCertificateField].fontSize}
                  onChange={(event) =>
                    updateCertificateTemplateField(selectedCertificateField, {
                      fontSize: Number(event.target.value),
                    })
                  }
                />
              </label>
              <label className="manage-certificate-template-setting">
                Warna
                <input
                  type="color"
                  value={certificateTemplateDraft.fields[selectedCertificateField].color}
                  onChange={(event) =>
                    updateCertificateTemplateField(selectedCertificateField, {
                      color: event.target.value,
                    })
                  }
                />
              </label>
              <label className="manage-certificate-template-setting">
                Rata
                <select
                  value={certificateTemplateDraft.fields[selectedCertificateField].align}
                  onChange={(event) =>
                    updateCertificateTemplateField(selectedCertificateField, {
                      align: event.target.value,
                    })
                  }
                >
                  <option value="left">Kiri</option>
                  <option value="center">Tengah</option>
                  <option value="right">Kanan</option>
                </select>
              </label>
              <label className="manage-certificate-template-setting">
                Font
                <select
                  value={certificateTemplateDraft.fields[selectedCertificateField].fontFamily}
                  onChange={(event) =>
                    updateCertificateTemplateField(selectedCertificateField, {
                      fontFamily: event.target.value,
                    })
                  }
                >
                  {certificateTemplateFontOptions.map((font) => (
                    <option key={font.value} value={font.value}>
                      {font.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="manage-certificate-template-setting">
                Tebal
                <select
                  value={certificateTemplateDraft.fields[selectedCertificateField].fontWeight}
                  onChange={(event) =>
                    updateCertificateTemplateField(selectedCertificateField, {
                      fontWeight: event.target.value,
                    })
                  }
                >
                  <option value="400">Normal</option>
                  <option value="500">Medium</option>
                  <option value="600">Semi Bold</option>
                  <option value="700">Bold</option>
                </select>
              </label>
              <button
                type="button"
                className="manage-certificate-template-save-settings"
                onClick={handleSaveCertificateTemplateSettings}
                disabled={certificateTemplateLoading}
              >
                {certificateTemplateLoading ? "Menyimpan..." : "Simpan Posisi"}
              </button>
            </div>
          )}
        </section>

          </>
        )}
      </div>

      <UploadMaterialDialog
        isOpen={Boolean(uploadTarget)}
        onSelectFile={handleUploadSelect}
        onCancel={() => setUploadTarget(null)}
        multiple={uploadTarget === "add"}
      />

      <EditMaterialDialog
        isOpen={Boolean(editingMaterial)}
        material={editingMaterial}
        onSubmit={setPendingEdit}
        onCancel={closeEdit}
        onOpenUpload={() => setUploadTarget("edit")}
        selectedFileName={editFileName}
        selectedFile={editFile}
        loading={loading}
        trainings={trainings}
        lockTraining={Boolean(trainingId)}
      />

      {editingTraining && (
        <div className="manage-training-edit-overlay">
          <form
            className="manage-training-edit-dialog"
            onSubmit={handleUpdateTraining}
            role="dialog"
            aria-modal="true"
            aria-labelledby="manage-training-edit-title"
          >
            <h3 id="manage-training-edit-title" className="manage-training-edit-title">
              Edit Pelatihan
            </h3>
            <label className="manage-training-edit-field" htmlFor="edit-training-title">
              Nama Pelatihan
            </label>
            <input
              id="edit-training-title"
              value={editTrainingTitle}
              onChange={(event) => {
                setEditTrainingTitle(event.target.value);
                setEditTrainingError("");
              }}
              disabled={editTrainingLoading || editingTraining.is_general_orientation}
              autoFocus
            />
            {editTrainingError && (
              <p className="manage-training-edit-error" role="alert">
                {editTrainingError}
              </p>
            )}
            <label className="manage-training-toggle">
              <input
                type="checkbox"
                checked={editTrainingActive}
                onChange={(event) => setEditTrainingActive(event.target.checked)}
                disabled={editTrainingLoading || editingTraining.is_general_orientation}
              />
              Pelatihan aktif
            </label>
            <label className="manage-training-edit-field" htmlFor="edit-training-access-code">
              Kode Post-Test Baru
            </label>
            <input
              id="edit-training-access-code"
              value={editTrainingAccessCode}
              onChange={(event) => {
                setEditTrainingAccessCode(event.target.value);
                setClearTrainingAccessCode(false);
              }}
              disabled={editTrainingLoading || clearTrainingAccessCode}
            />
            {(editingTraining.has_post_test_access_code || editTrainingOriginalAccessCode) && (
              <label className="manage-training-clear-code">
                <input
                  type="checkbox"
                  checked={clearTrainingAccessCode}
                  onChange={(event) => {
                    setClearTrainingAccessCode(event.target.checked);
                    if (event.target.checked) setEditTrainingAccessCode("");
                  }}
                  disabled={editTrainingLoading}
                />
                Hapus kode Post-Test yang aktif
              </label>
            )}
            <div className="manage-training-edit-actions">
              <button
                type="button"
                className="manage-training-edit-btn manage-training-edit-cancel"
                onClick={closeTrainingEdit}
                disabled={editTrainingLoading}
              >
                Batal
              </button>
              <button
                type="submit"
                className="manage-training-edit-btn manage-training-edit-save"
                disabled={editTrainingLoading}
              >
                {editTrainingLoading ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </form>
        </div>
      )}

      <MaterialConfirmDialog
        isOpen={Boolean(deletingTraining)}
        title="Hapus Pelatihan"
        message={`Apakah Anda yakin ingin menghapus pelatihan "${deletingTraining?.title ?? ""}"?`}
        note="Materi, ujian, hasil, dan data terkait pelatihan ini akan ikut dihapus."
        confirmLabel={deletingTrainingLoading ? "Menghapus..." : "Hapus"}
        variant="danger"
        onConfirm={confirmDeleteTraining}
        onCancel={() => setDeletingTraining(null)}
        loading={deletingTrainingLoading}
      />

      <MaterialConfirmDialog
        isOpen={Boolean(pendingAdd)}
        title="Tambah Materi"
        message={
          pendingAdd?.items?.length > 1
            ? `Apakah Anda yakin ingin menambahkan ${pendingAdd.items.length} materi ini?`
            : "Apakah Anda yakin ingin menambahkan materi ini?"
        }
        confirmLabel={loading ? "Menambahkan..." : "Tambah"}
        onConfirm={confirmAdd}
        onCancel={() => setPendingAdd(null)}
        loading={loading}
      />

      <MaterialConfirmDialog
        isOpen={Boolean(pendingEdit)}
        title="Edit Materi"
        message="Apakah Anda yakin ingin menyimpan perubahan materi ini?"
        confirmLabel={loading ? "Menyimpan..." : "Simpan"}
        onConfirm={confirmEdit}
        onCancel={() => setPendingEdit(null)}
        loading={loading}
      />

      <MaterialConfirmDialog
        isOpen={Boolean(deletingMaterialId)}
        title="Hapus Materi"
        message="Apakah Anda yakin ingin menghapus materi ini?"
        note="Data yang dihapus tidak dapat dikembalikan."
        confirmLabel={loading ? "Menghapus..." : "Hapus"}
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeletingMaterialId(null)}
        loading={loading}
      />

      {toast && <div className="manage-material-toast">{toast}</div>}
    </DashboardLayout>
  );
}

export default ManageMaterialPage;
