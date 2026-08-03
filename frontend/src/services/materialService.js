import api from "./api";
import { mockMaterials, mockTrainings } from "./mockTrainingData";

const DEFAULT_TRAINING_ID = 1;
const CHUNK_SIZE = 1024 * 1024;
const EMERGENCY_UNLOCK_EMPLOYEE_FLOW = false;
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
    completed: EMERGENCY_UNLOCK_EMPLOYEE_FLOW || Boolean(m.completed),
  };
};

const openBlankMaterialWindow = () => {
  const popup = window.open("about:blank", "_blank");

  if (popup) {
    try {
      popup.opener = null;
      popup.document.title = "Memuat materi...";
      popup.document.body.innerHTML =
        '<p style="font-family: sans-serif; padding: 24px;">Memuat materi...</p>';
    } catch {
      // Some browsers restrict writing to the new window; navigation below can still work.
    }
  }

  return popup;
};

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const getMaterialFileName = (material, file) =>
  String(file?.file_name || material?.fileName || material?.title || "materi").trim();

const getMaterialViewerPath = (filename) => {
  const basePath = new URL(import.meta.env.BASE_URL, window.location.origin).pathname;
  const normalizedBase = basePath.endsWith("/") ? basePath : `${basePath}/`;

  return `${normalizedBase}material-viewer/${encodeURIComponent(filename)}`;
};

const showMaterialBlobInWindow = (popup, fileUrl, filename) => {
  if (!popup) return false;

  try {
    const safeFilename = escapeHtml(filename);
    const viewerUrl = `${fileUrl}#toolbar=0&navpanes=0`;
    popup.document.open();
    popup.document.write(`<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${safeFilename}</title>
  <style>
    * { box-sizing: border-box; }
    html, body { width: 100%; height: 100%; margin: 0; background: #202124; }
    .material-viewer { display: flex; flex-direction: column; width: 100%; height: 100%; }
    .material-title {
      min-height: 44px;
      padding: 12px 16px;
      overflow: hidden;
      background: #303134;
      color: #ffffff;
      font: 600 14px Arial, sans-serif;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    iframe { flex: 1; width: 100%; border: 0; background: #ffffff; }
  </style>
</head>
<body>
  <main class="material-viewer">
    <div class="material-title">${safeFilename}</div>
    <iframe src="${viewerUrl}" title="${safeFilename}"></iframe>
  </main>
</body>
</html>`);
    popup.document.close();
    popup.history.replaceState(null, "", getMaterialViewerPath(filename));
    return true;
  } catch {
    return false;
  }
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
  training: data.training
    ? {
        ...data.training,
        pre_test_completed: EMERGENCY_UNLOCK_EMPLOYEE_FLOW || Boolean(data.training.pre_test_completed),
        post_test_unlocked: EMERGENCY_UNLOCK_EMPLOYEE_FLOW || Boolean(data.training.post_test_unlocked),
      }
    : data.training,
  materials: (data.materials || []).map(mapMaterialFromApi),
});

export const getMaterials = async (trainingId = DEFAULT_TRAINING_ID) => {
  if (import.meta.env.VITE_USE_DUMMY_DATA === "true") {
    const training = mockTrainings.find((item) => String(item.id) === String(trainingId));
    return {
      training: {
        ...(training ?? { id: trainingId, title: "Pelatihan" }),
        pre_test_completed: false,
        post_test_unlocked: false,
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

export const openMaterialFile = async (material, file, targetWindow = null) => {
  const popup = targetWindow ?? openBlankMaterialWindow();

  try {
    const response = await api.get(`/materials/${material.id}/files/${file.id}/download`, {
      responseType: "blob",
    });
    const filename = getMaterialFileName(material, file);
    const namedFile = new File([response.data], filename, {
      type: response.data.type || file.file_type || "application/octet-stream",
    });
    const fileUrl = URL.createObjectURL(namedFile);

    if (showMaterialBlobInWindow(popup, fileUrl, filename)) {
      window.setTimeout(() => URL.revokeObjectURL(fileUrl), 60000);
      return;
    }

    if (popup) {
      popup.location.href = fileUrl;
    } else {
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = filename;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.click();
    }

    window.setTimeout(() => URL.revokeObjectURL(fileUrl), 60000);
  } catch (error) {
    popup?.close();
    throw error;
  }
};

export const openMaterialWindow = openBlankMaterialWindow;

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
