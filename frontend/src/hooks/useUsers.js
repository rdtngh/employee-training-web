import { useCallback, useEffect, useRef, useState } from "react";
import * as userService from "../services/userService";

export const useUsers = () => {
  const mountedRef = useRef(false);
  const currentSearchRef = useRef("");
  const optionsLoadedRef = useRef(false);
  const requestIdRef = useRef(0);
  const [users, setUsers] = useState([]);
  const [userFormOptions, setUserFormOptions] = useState({
    departments: [],
    roles: [],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadUsers = useCallback(async (search = currentSearchRef.current, options = {}) => {
    if (!mountedRef.current) return;
    const { refreshOptions = false } = options;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    currentSearchRef.current = search;
    setLoading(true);
    try {
      const [data, formOptions] = await Promise.all([
        userService.getAllUsers(search),
        optionsLoadedRef.current && !refreshOptions
          ? Promise.resolve(null)
          : userService.getUserFormOptions(),
      ]);
      if (mountedRef.current && requestId === requestIdRef.current) {
        setUsers(data);
        if (formOptions) {
          setUserFormOptions(formOptions);
          optionsLoadedRef.current = true;
        }
      }
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  const addUser = useCallback(
    async (formData) => {
      setLoading(true);
      try {
        await userService.createUser(formData);
        if (!mountedRef.current) return false;
        await loadUsers(currentSearchRef.current, { refreshOptions: true });
        return true;
      } catch (error) {
        console.error("Error adding user:", error);
        return error.response?.data?.message || "Gagal menambahkan pengguna.";
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    [loadUsers]
  );

  const updateUser = useCallback(
    async (id, formData) => {
      setLoading(true);
      try {
        await userService.updateUser(id, formData);
        if (!mountedRef.current) return false;
        await loadUsers(currentSearchRef.current, { refreshOptions: true });
        return true;
      } catch (error) {
        console.error("Error updating user:", error);
        return error.response?.data?.message || "Gagal memperbarui pengguna.";
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    [loadUsers]
  );

  const deleteUser = useCallback(
    async (id) => {
      setLoading(true);
      try {
        await userService.deleteUser(id);
        if (!mountedRef.current) return false;
        await loadUsers(currentSearchRef.current, { refreshOptions: true });
        return true;
      } catch (error) {
        console.error("Error deleting user:", error);
        return error.response?.data?.message || "Gagal menghapus pengguna.";
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    [loadUsers]
  );

  const importUsers = useCallback(
    async (file) => {
      setLoading(true);
      try {
        const result = await userService.importUsers(file);
        if (!mountedRef.current) return false;
        await loadUsers(currentSearchRef.current, { refreshOptions: true });
        return result;
      } catch (error) {
        console.error("Error importing users:", error);
        return error.response?.data?.message || "Gagal mengimport pengguna.";
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    [loadUsers]
  );

  return {
    users,
    userFormOptions,
    loading,
    loadUsers,
    addUser,
    updateUser,
    deleteUser,
    importUsers,
  };
};
