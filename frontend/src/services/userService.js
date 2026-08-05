import api from "./api";

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
  isActive: user.isActive ?? true,
});

export const getAllUsers = async (search = "") => {
  const keyword = search.trim();
  const response = await api.get("/users", {
    params: keyword ? { search: keyword } : undefined,
  });
  return response.data?.data?.map(mapFromApiResponse) ?? [];
};

export const getUserFormOptions = async () => {
  const response = await api.get("/users/options");
  return {
    departments: response.data?.data?.departments ?? [],
    roles: response.data?.data?.roles ?? [],
  };
};

export const createUser = async (payload) => {
  await api.post("/users", mapToApiPayload(payload));
};

export const updateUser = async (id, payload) => {
  await api.put(`/users/${id}`, mapToApiPayload(payload));
};

export const updateUserStatus = async (id, isActive) => {
  await api.patch(`/users/${id}/status`, { is_active: isActive });
};

export const importUsers = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post("/users/import", formData, {
    timeout: 300000,
  });
  return response.data?.data ?? {};
};
