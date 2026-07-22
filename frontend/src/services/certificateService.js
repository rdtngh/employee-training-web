import api from "./api";

const dummyCertificateResponse = {
  title: "Sertifikat",
  message: "Daftar sertifikat peserta yang telah lulus pelatihan akan ditampilkan di sini.",
  certificates: [],
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
