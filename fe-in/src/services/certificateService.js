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

export const getCertificates = async () => ({
  ...dummyCertificateResponse,
  certificates: [...dummyCertificateResponse.certificates],
});

export const downloadCertificate = async (trainingId) => {
  if (import.meta.env.VITE_USE_DUMMY_DATA !== "false") {
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
