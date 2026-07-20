import { useCallback, useEffect, useRef, useState } from "react";
import * as userService from "../services/userService";

export const useUsers = () => {
  const mountedRef = useRef(false);
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

  const loadUsers = useCallback(async () => {
    if (!mountedRef.current) return;
    setLoading(true);
    try {
      const [data, options] = await Promise.all([
        userService.getAllUsers(),
        userService.getUserFormOptions(),
      ]);
      if (mountedRef.current) {
        setUsers(data);
        setUserFormOptions(options);
      }
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  const addUser = useCallback(
    async (formData) => {
      setLoading(true);
      try {
        await userService.createUser(formData);
        if (!mountedRef.current) return false;
        await loadUsers();
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
        await loadUsers();
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
        await loadUsers();
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

  return {
    users,
    userFormOptions,
    loading,
    loadUsers,
    addUser,
    updateUser,
    deleteUser,
  };
};
