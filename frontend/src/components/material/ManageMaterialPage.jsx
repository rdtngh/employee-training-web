import { useCallback, useEffect, useState } from "react";
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

function ManageMaterialPage({ role }) {
  const navigate = useNavigate();
  const { trainingId } = useParams();
  const rolePath = role === "superadmin" ? "superadmin" : "admin";
  const [trainings, setTrainings] = useState([]);
  const [trainingLoading, setTrainingLoading] = useState(true);
  const [trainingError, setTrainingError] = useState("");
  const [newTrainingTitle, setNewTrainingTitle] = useState("");
  const [addingTraining, setAddingTraining] = useState(false);
  const [trainingFormError, setTrainingFormError] = useState("");
  const [editingTraining, setEditingTraining] = useState(null);
  const [editTrainingTitle, setEditTrainingTitle] = useState("");
  const [editTrainingError, setEditTrainingError] = useState("");
  const [editTrainingLoading, setEditTrainingLoading] = useState(false);
  const [deletingTraining, setDeletingTraining] = useState(null);
  const [deletingTrainingLoading, setDeletingTrainingLoading] = useState(false);
  const selectedTraining = trainings.find((training) => String(training.id) === String(trainingId));
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

  function openEdit(material) {
    setEditingMaterial(material);
    setEditFileName(material.fileName);
    setEditFile(null);
  }

  function openTrainingEdit(training) {
    setEditingTraining(training);
    setEditTrainingTitle(training.title ?? "");
    setEditTrainingError("");
  }

  function closeTrainingEdit() {
    setEditingTraining(null);
    setEditTrainingTitle("");
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
      const training = await trainingService.createTraining({ title });
      setTrainings((current) => [...current, training]);
      setNewTrainingTitle("");
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
      const updatedTraining = await trainingService.updateTraining(editingTraining.id, { title });
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
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trainings.length === 0 ? (
                        <tr>
                          <td colSpan="3" className="material-table-empty">
                            Belum ada pelatihan.
                          </td>
                        </tr>
                      ) : (
                        trainings.map((training, index) => (
                          <tr key={training.id}>
                            <td data-label="No">{index + 1}</td>
                            <td data-label="Daftar Pelatihan">{training.title}</td>
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
                                <button
                                  type="button"
                                  className="material-action material-action-delete"
                                  onClick={() => setDeletingTraining(training)}
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
              disabled={editTrainingLoading}
              autoFocus
            />
            {editTrainingError && (
              <p className="manage-training-edit-error" role="alert">
                {editTrainingError}
              </p>
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
