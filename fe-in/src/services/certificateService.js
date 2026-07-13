import api from "./api";

const dummyCertificateResponse = {
  title: "Sertifikat",
  message: "Daftar sertifikat peserta yang telah lulus pelatihan akan ditampilkan di sini.",
  certificates: [],
};

export const getCertificates = async () => ({
  ...dummyCertificateResponse,
  certificates: [...dummyCertificateResponse.certificates],
});

export const downloadCertificate = async (id) => {
  const response = await api.get(`/certificates/${id}/download`, {
    responseType: "blob",
  });
  return response.data;
};
