import api from "./api";

const userFormOptions = {
  departments: ["IT", "HRD", "Keuangan", "Pelayanan", "Manajemen"],
  roles: ["Super Admin", "Admin", "Karyawan"],
};

const mapToApiPayload = (payload) => ({
  employee_number: payload.userId,
  name: payload.user,
  department: payload.department,
  role: payload.role,
});

const mapFromApiResponse = (user) => ({
  id: user.id,
  user: user.user,
  userId: user.userId,
  department: user.department,
  role: user.role,
});

export const getAllUsers = async () => {
  const response = await api.get("/users");
  return response.data?.data?.map(mapFromApiResponse) ?? [];
};

// Ganti dengan endpoint metadata saat daftar departemen/role dikelola backend.
export const getUserFormOptions = async () => ({
  departments: [...userFormOptions.departments],
  roles: [...userFormOptions.roles],
});

export const createUser = async (payload) => {
  await api.post("/users", mapToApiPayload(payload));
};

export const updateUser = async (id, payload) => {
  await api.put(`/users/${id}`, mapToApiPayload(payload));
};

export const deleteUser = async (id) => {
  await api.delete(`/users/${id}`);
};

export const importUsers = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post("/users/import", formData, {
    timeout: 300000,
  });
  return response.data?.data ?? {};
};
