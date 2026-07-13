import { useCallback, useEffect, useRef, useState } from "react";
import * as examService from "../services/examService";

export const useExam = () => {
  const mountedRef = useRef(false);
  const [questions, setQuestions] = useState([]);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Validasi form
  const validateQuestion = useCallback((formData) => {
    const newErrors = {};

    if (!formData.question?.trim()) {
      newErrors.question = "Soal wajib diisi";
    }
    if (!formData.options?.a?.trim()) {
      newErrors.optionA = "Option A wajib diisi";
    }
    if (!formData.options?.b?.trim()) {
      newErrors.optionB = "Option B wajib diisi";
    }
    if (!formData.options?.c?.trim()) {
      newErrors.optionC = "Option C wajib diisi";
    }
    if (!formData.options?.d?.trim()) {
      newErrors.optionD = "Option D wajib diisi";
    }
    if (!formData.correctAnswer) {
      newErrors.correctAnswer = "Jawaban benar wajib dipilih";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, []);

  // Reset form ke state awal
  const resetForm = useCallback(() => {
    setSelectedQuestion(null);
    setIsEditing(false);
    setErrors({});
  }, []);

  // Load semua questions
  const loadQuestions = useCallback(async () => {
    if (!mountedRef.current) return;
    setLoading(true);
    try {
      const data = await examService.getAllExam();
      if (mountedRef.current) setQuestions(data);
    } catch (error) {
      console.error("Error loading questions:", error);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  // Add question baru
  const addQuestion = useCallback(
    async (formData) => {
      if (!validateQuestion(formData)) {
        return false;
      }

      setLoading(true);
      try {
        await examService.createExam(formData);
        if (!mountedRef.current) return false;
        await loadQuestions();
        return true;
      } catch (error) {
        console.error("Error adding question:", error);
        return false;
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    [loadQuestions, validateQuestion]
  );

  // Update question
  const updateQuestion = useCallback(
    async (id, formData) => {
      if (!validateQuestion(formData)) {
        return false;
      }

      setLoading(true);
      try {
        await examService.updateExam(id, formData);
        if (!mountedRef.current) return false;
        await loadQuestions();
        resetForm();
        return true;
      } catch (error) {
        console.error("Error updating question:", error);
        return false;
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    [loadQuestions, resetForm, validateQuestion]
  );

  // Delete question
  const deleteQuestion = useCallback(async (id) => {
    setLoading(true);
    try {
      await examService.deleteExam(id);
      if (!mountedRef.current) return false;
      await loadQuestions();
      return true;
    } catch (error) {
      console.error("Error deleting question:", error);
      return false;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setShowDeleteDialog(false);
        setDeletingId(null);
      }
    }
  }, [loadQuestions]);

  // Set question untuk di-edit
  const handleEdit = (question) => {
    setSelectedQuestion(question);
    setIsEditing(true);
    setErrors({});
  };

  // Buka dialog delete
  const handleDelete = (id) => {
    setDeletingId(id);
    setShowDeleteDialog(true);
  };

  // Close delete dialog
  const closeDeleteDialog = () => {
    setShowDeleteDialog(false);
    setDeletingId(null);
  };

  return {
    // State
    questions,
    selectedQuestion,
    isEditing,
    loading,
    showDeleteDialog,
    deletingId,
    errors,
    // Functions
    loadQuestions,
    validateQuestion,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    handleEdit,
    handleDelete,
    resetForm,
    closeDeleteDialog,
  };
};
