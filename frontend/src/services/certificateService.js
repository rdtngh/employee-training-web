import api from "./api";
import { mockTrainings } from "./mockTrainingData";

const dummyCertificateResponse = {
  title: "Sertifikat",
  message: "Daftar sertifikat peserta yang telah lulus pelatihan akan ditampilkan di sini.",
  certificates: [],
};

const mockCertificatePreview = {
  employee_name: "Bening Apni P.",
  training_title: "Pelatihan Keselamatan Pasien",
  sequence_number: 1213,
  roman_month: "IV",
  year: 2026,
  completion_date: "2026-07-30",
  eligible: true,
};

const getFilename = (disposition, fallback) => {
  const encoded = disposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const plain = disposition?.match(/filename="?([^";]+)"?/i)?.[1];
  return decodeURIComponent(encoded || plain || fallback);
};

export const getCertificates = async () => {
  if (import.meta.env.VITE_USE_DUMMY_DATA === "true") {
    return {
      ...dummyCertificateResponse,
      certificates: [...dummyCertificateResponse.certificates],
    };
  }

  const response = await api.get("/certificates");
  return response.data?.data ?? response.data;
};

export const downloadCertificate = async (trainingId) => {
  if (import.meta.env.VITE_USE_DUMMY_DATA === "true") {
    return {
      blob: new Blob(["Dummy sertifikat. File PDF akan dibuat oleh backend Laravel."], {
        type: "text/plain",
      }),
      filename: `sertifikat-${trainingId}-dummy.txt`,
    };
  }

  const response = await api.get(`/certificates/${trainingId}/download`, {
    responseType: "blob",
  });
  return {
    blob: response.data,
    filename: getFilename(
      response.headers["content-disposition"],
      `sertifikat-${trainingId}.pdf`
    ),
  };
};

export const downloadCertificateFile = async (certificateId) => {
  const response = await api.get(`/certificates/${certificateId}/file`, {
    responseType: "blob",
  });

  return {
    blob: response.data,
    filename: getFilename(
      response.headers["content-disposition"],
      `sertifikat-${certificateId}.pdf`
    ),
  };
};

export const getCertificatePreview = async (trainingId) => {
  const useMockCertificate =
    import.meta.env.VITE_CERTIFICATE_USE_MOCK === "true" ||
    import.meta.env.VITE_USE_DUMMY_DATA === "true";

  if (useMockCertificate) {
    const training = mockTrainings.find((item) => String(item.id) === String(trainingId));

    return {
      ...mockCertificatePreview,
      training_id: trainingId,
      training_title: training?.title ?? mockCertificatePreview.training_title,
    };
  }

  if (!trainingId) {
    throw new Error("Training sertifikat belum dipilih.");
  }

  const response = await api.get(`/certificates/${trainingId}`);
  const payload = response.data?.data ?? response.data;

  if (payload?.eligible === false) {
    throw new Error(response.data?.message || "Anda belum memenuhi syarat untuk mendapatkan sertifikat.");
  }

  return payload;
};
