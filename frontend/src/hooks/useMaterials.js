import { useCallback, useEffect, useRef, useState } from "react";
import * as materialService from "../services/materialService";

const getApiErrorMessage = (error, fallback) => {
  const data = error.response?.data;
  const validationErrors = data?.errors ? Object.values(data.errors).flat() : [];

  return validationErrors[0] || data?.message || fallback;
};

export const useMaterials = () => {
  const mountedRef = useRef(false);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadMaterials = useCallback(async () => {
    if (!mountedRef.current) return;
    setLoading(true);
    try {
      const data = await materialService.getAllMaterials();
      if (mountedRef.current) setMaterials(data);
    } catch (error) {
      console.error("Error loading materials:", error);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  const addMaterial = useCallback(
    async (formData) => {
      setLoading(true);
      try {
        if (formData.items?.length > 1) {
          await materialService.createMaterialsBulk(formData);
        } else {
          await materialService.createMaterial(formData);
        }
        if (!mountedRef.current) return { success: false };
        await loadMaterials();
        return { success: true };
      } catch (error) {
        console.error("Error adding material:", error);
        return {
          success: false,
          message: getApiErrorMessage(error, "Materi gagal ditambahkan."),
        };
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    [loadMaterials]
  );

  const updateMaterial = useCallback(
    async (id, formData) => {
      setLoading(true);
      try {
        await materialService.updateMaterial(id, formData);
        if (!mountedRef.current) return { success: false };
        await loadMaterials();
        return { success: true };
      } catch (error) {
        console.error("Error updating material:", error);
        return {
          success: false,
          message: getApiErrorMessage(error, "Materi gagal diperbarui."),
        };
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    [loadMaterials]
  );

  const deleteMaterial = useCallback(
    async (id) => {
      setLoading(true);
      try {
        await materialService.deleteMaterial(id);
        if (!mountedRef.current) return { success: false };
        await loadMaterials();
        return { success: true };
      } catch (error) {
        console.error("Error deleting material:", error);
        return {
          success: false,
          message: getApiErrorMessage(error, "Materi gagal dihapus."),
        };
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    [loadMaterials]
  );

  return {
    materials,
    loading,
    loadMaterials,
    addMaterial,
    updateMaterial,
    deleteMaterial,
  };
};
