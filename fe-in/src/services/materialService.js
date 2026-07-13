import api from "./api";

const DEFAULT_TRAINING_ID = 1;

const employeeMaterialResponse = {
  training: {
    id: 1,
    title: "Pelatihan Keselamatan Pasien",
    pre_test_completed: false,
    post_test_unlocked: false,
  },
  materials: [
    { id: 1, title: "Materi 1", completed: true },
    { id: 2, title: "Materi 2", completed: true },
    { id: 3, title: "Materi 3", completed: false },
    { id: 4, title: "Materi 4", completed: false },
    { id: 5, title: "Materi 5", completed: false },
    { id: 6, title: "Materi 6", completed: true },
    { id: 7, title: "Materi 7", completed: true },
    { id: 8, title: "Materi 8", completed: false },
    { id: 9, title: "Materi 9", completed: false },
    { id: 10, title: "Materi 10", completed: false },
  ],
};

const resolveBackendUrl = (path) => {
  if (!path || /^https?:\/\//i.test(path)) return path;

  const browserOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
  const apiUrl = new URL(api.defaults.baseURL, browserOrigin);
  return new URL(path, apiUrl.origin).toString();
};

const mapMaterialFromApi = (m) => ({
  id: m.id,
  title: m.title,
  description: m.description,
  speaker: m.speaker,
  order_number: m.order_number,
  files: (m.files || []).map((file) => ({
    ...file,
    file_path: resolveBackendUrl(file.file_path),
  })),
  fileName: m.files?.[0]?.file_name || "",
  fileType: m.files?.[0]?.file_type || "",
});

export const getAllMaterials = async () => {
  // fetch materials for default training
  const res = await api.get(`/trainings/${DEFAULT_TRAINING_ID}/materials`);
  return (res.data?.data || []).map(mapMaterialFromApi);
};

// Kontrak Employee. Ganti isi fungsi ini dengan request API saat endpoint progress siap.
export const getMaterials = async () => ({
  training: { ...employeeMaterialResponse.training },
  materials: employeeMaterialResponse.materials.map((material) => ({ ...material })),
});

export const createMaterial = async (materialData) => {
  const fd = new FormData();
  fd.append("title", materialData.title);
  fd.append("training_id", materialData.training_id || DEFAULT_TRAINING_ID);
  if (materialData.description) fd.append("description", materialData.description);

  if (materialData.file) {
    fd.append("files[]", materialData.file, materialData.fileName || materialData.file.name);
  }

  const res = await api.post("/materials", fd);
  return mapMaterialFromApi(res.data.data);
};

export const createMaterialsBulk = async (materialData) => {
  const fd = new FormData();
  fd.append("training_id", materialData.training_id || DEFAULT_TRAINING_ID);

  materialData.items.forEach((item) => {
    fd.append("titles[]", item.title);
    fd.append("files[]", item.file, item.fileName || item.file.name);
  });

  const res = await api.post("/materials/bulk", fd);
  return (res.data?.data || []).map(mapMaterialFromApi);
};

export const updateMaterial = async (id, materialData) => {
  const fd = new FormData();
  if (materialData.title) fd.append("title", materialData.title);
  if (materialData.description) fd.append("description", materialData.description);
  if (materialData.file) {
    fd.append("files[]", materialData.file, materialData.fileName || materialData.file.name);
  }

  fd.append("_method", "PUT");

  const res = await api.post(`/materials/${id}`, fd);
  return mapMaterialFromApi(res.data.data);
};

export const deleteMaterial = async (id) => {
  await api.delete(`/materials/${id}`);
  return true;
};
