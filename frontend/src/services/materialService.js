import api from "./api";
import { mockMaterials, mockTrainings } from "./mockTrainingData";

const DEFAULT_TRAINING_ID = 1;
const CHUNK_SIZE = 1024 * 1024;
let mockMaterialStore = mockMaterials.map((material) => ({ ...material }));

const resolveBackendUrl = (path) => {
  if (!path || /^https?:\/\//i.test(path)) return path;

  const browserOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
  const apiUrl = new URL(api.defaults.baseURL, browserOrigin);
  return new URL(path, apiUrl.origin).toString();
};

const mapMaterialFromApi = (m) => {
  const files = [...(m.files || [])].sort((a, b) => Number(b.id || 0) - Number(a.id || 0));

  return {
    id: m.id,
    training_id: m.training_id ?? m.training?.id,
    training: m.training,
    title: m.title,
    description: m.description,
    speaker: m.speaker,
    order_number: m.order_number,
    files: files.map((file) => ({
      ...file,
      file_path: resolveBackendUrl(`/api/materials/${m.id}/files/${file.id}/download`),
    })),
    fileName: files[0]?.file_name || "",
    fileType: files[0]?.file_type || "",
    completed: Boolean(m.completed),
  };
};

const getMockMaterialsByTraining = (trainingId = DEFAULT_TRAINING_ID) =>
  mockMaterialStore.filter((material) => String(material.training_id) === String(trainingId));

export const getAllMaterials = async (trainingId = DEFAULT_TRAINING_ID) => {
  if (import.meta.env.VITE_USE_DUMMY_DATA === "true") {
    return getMockMaterialsByTraining(trainingId).map(mapMaterialFromApi);
  }

  const res = await api.get(`/trainings/${trainingId}/materials`);
  return (res.data?.data || []).map(mapMaterialFromApi);
};

const mapMaterialProgressFromApi = (data) => ({
  training: data.training,
  materials: (data.materials || []).map(mapMaterialFromApi),
});

export const getMaterials = async (trainingId = DEFAULT_TRAINING_ID) => {
  if (import.meta.env.VITE_USE_DUMMY_DATA === "true") {
    const training = mockTrainings.find((item) => String(item.id) === String(trainingId));
    return {
      training: {
        ...(training ?? { id: trainingId, title: "Pelatihan" }),
        pre_test_completed: true,
        post_test_unlocked: true,
      },
      materials: getMockMaterialsByTraining(trainingId).map(mapMaterialFromApi),
    };
  }

  const res = await api.get(`/trainings/${trainingId}/materials/progress`);
  return mapMaterialProgressFromApi(res.data?.data || {});
};

export const getMaterial = async (id) => {
  const res = await api.get(`/materials/${id}`);
  return mapMaterialFromApi(res.data?.data || {});
};

export const markMaterialAccessed = async (materialId) => {
  const res = await api.post(`/materials/${materialId}/access`);
  return res.data?.data || {};
};

export const openMaterialFile = async (material, file) => {
  const response = await api.get(`/materials/${material.id}/files/${file.id}/download`, {
    responseType: "blob",
  });
  const fileUrl = URL.createObjectURL(response.data);
  window.open(fileUrl, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(fileUrl), 60000);
};

export const getMaterialProgress = async (trainingId = DEFAULT_TRAINING_ID) => {
  if (import.meta.env.VITE_USE_DUMMY_DATA === "true") {
    return getMaterials(trainingId);
  }

  const res = await api.get(`/trainings/${trainingId}/materials/progress`);
  return mapMaterialProgressFromApi(res.data?.data || {});
};

export const createMaterial = async (materialData) => {
  if (import.meta.env.VITE_USE_DUMMY_DATA === "true") {
    const material = {
      id: Date.now(),
      training_id: Number(materialData.training_id || DEFAULT_TRAINING_ID),
      title: materialData.title || materialData.fileName || "Materi",
      description: materialData.description,
      files: materialData.file
        ? [{ id: Date.now(), file_name: materialData.fileName || materialData.file.name }]
        : [],
      completed: false,
    };
    mockMaterialStore = [...mockMaterialStore, material];
    return mapMaterialFromApi(material);
  }

  if (materialData.file && materialData.file.size > CHUNK_SIZE) {
    return createMaterialChunked(materialData);
  }

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

const createMaterialChunked = async (materialData) => {
  const file = materialData.file;
  const uploadId =
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  let material = null;

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
    const start = chunkIndex * CHUNK_SIZE;
    const chunk = file.slice(start, Math.min(start + CHUNK_SIZE, file.size));
    const fd = new FormData();

    fd.append("title", materialData.title);
    fd.append("training_id", materialData.training_id || DEFAULT_TRAINING_ID);
    fd.append("upload_id", uploadId);
    fd.append("chunk_index", String(chunkIndex));
    fd.append("total_chunks", String(totalChunks));
    fd.append("original_name", materialData.fileName || file.name);
    fd.append("file_type", materialData.fileType || file.type || "application/octet-stream");
    fd.append("chunk", chunk, `${chunkIndex}.part`);
    if (materialData.description) fd.append("description", materialData.description);

    const res = await api.post("/materials/chunked", fd);

    if (res.data?.data?.complete === false) {
      continue;
    }

    if (res.data?.data?.id) {
      material = mapMaterialFromApi(res.data.data);
    }
  }

  return material;
};

export const createMaterialsBulk = async (materialData) => {
  const materials = [];

  for (const item of materialData.items) {
    const material = await createMaterial({
      ...item,
      training_id: materialData.training_id || DEFAULT_TRAINING_ID,
    });
    materials.push(material);
  }

  return materials;
};

export const updateMaterial = async (id, materialData) => {
  if (import.meta.env.VITE_USE_DUMMY_DATA === "true") {
    mockMaterialStore = mockMaterialStore.map((material) =>
      String(material.id) === String(id)
        ? {
            ...material,
            training_id: Number(materialData.training_id || material.training_id),
            title: materialData.title || material.title,
            description: materialData.description ?? material.description,
          }
        : material
    );

    return mapMaterialFromApi(
      mockMaterialStore.find((material) => String(material.id) === String(id)) ?? {}
    );
  }

  const fd = new FormData();
  if (materialData.training_id) fd.append("training_id", materialData.training_id);
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
  if (import.meta.env.VITE_USE_DUMMY_DATA === "true") {
    mockMaterialStore = mockMaterialStore.filter((material) => String(material.id) !== String(id));
    return true;
  }

  await api.delete(`/materials/${id}`);
  return true;
};
