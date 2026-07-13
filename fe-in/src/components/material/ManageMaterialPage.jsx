import { useEffect, useState } from "react";
import DashboardLayout from "../dashboard/DashboardLayout";
import MaterialTable from "./MaterialTable";
import MaterialForm from "./MaterialForm";
import UploadMaterialDialog from "./UploadMaterialDialog";
import MaterialConfirmDialog from "./MaterialConfirmDialog";
import EditMaterialDialog from "./EditMaterialDialog";
import { useMaterials } from "../../hooks/useMaterials";
import listIcon from "../../assets/icons/icon-daftar-materi.svg";
import addIcon from "../../assets/icons/icon-tambahmateri.svg";
import "./ManageMaterialPage.css";

function ManageMaterialPage({ role }) {
  const {
    materials,
    loading,
    loadMaterials,
    addMaterial,
    updateMaterial,
    deleteMaterial,
  } = useMaterials();
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

  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

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

  function closeEdit() {
    setEditingMaterial(null);
    setEditFileName(undefined);
    setEditFile(null);
    setPendingEdit(null);
  }

  function handleUploadSelect(file) {
    if (uploadTarget === "add") {
      const files = Array.isArray(file) ? file : [file];
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

    const fileUrl = file.file_path;
    const newWindow = window.open(fileUrl, "_blank");

    if (!newWindow) {
      setToast("Popup browser diblokir. Izinkan popup untuk membuka file.");
      return;
    }
  }

  async function confirmAdd() {
    if (!pendingAdd) return;

    const success = await addMaterial(pendingAdd);
    if (success) {
      setPendingAdd(null);
      setAddFileName("");
      setAddFiles([]);
      setAddResetSignal((current) => current + 1);
      setToast(pendingAdd.items?.length > 1 ? "Semua materi berhasil ditambahkan." : "Materi berhasil ditambahkan.");
    } else {
      setToast("Materi gagal ditambahkan. Coba pilih file yang lebih kecil.");
    }
  }

  async function confirmEdit() {
    if (!pendingEdit) return;

    const success = await updateMaterial(pendingEdit.id, pendingEdit);
    if (success) {
      closeEdit();
      setToast("Materi berhasil diperbarui.");
    } else {
      setToast("Materi gagal diperbarui. Coba pilih file yang lebih kecil.");
    }
  }

  async function confirmDelete() {
    if (!deletingMaterialId) return;

    const success = await deleteMaterial(deletingMaterialId);
    if (success) {
      setDeletingMaterialId(null);
      setToast("Materi berhasil dihapus.");
    }
  }

  return (
    <DashboardLayout role={role}>
      <div className="manage-material-page">
        <section className="manage-material-card">
          <div className="manage-material-header">
            <img src={listIcon} alt="" className="manage-material-header-icon" />
            <h1 className="manage-material-title">Daftar Materi</h1>
          </div>

          <MaterialTable
            materials={materials}
            onOpen={openMaterialFile}
            onEdit={openEdit}
            onDelete={setDeletingMaterialId}
          />
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
          />
        </section>
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
