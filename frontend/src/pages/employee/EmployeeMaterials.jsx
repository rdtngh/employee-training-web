import { useState } from "react";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import MaterialListCard from "../../components/employee/MaterialListCard";
import PreTestRequiredDialog from "../../components/employee/PreTestRequiredDialog";
import * as materialService from "../../services/materialService";
import { useServiceData } from "../../hooks/useServiceData";
import "./EmployeeMaterials.css";

function EmployeeMaterials() {
  const { data, loading } = useServiceData(materialService.getMaterials, undefined, {
    training: null,
    materials: [],
  });
  const [accessedMaterialIds, setAccessedMaterialIds] = useState([]);
  const [error, setError] = useState("");

  const materials = (data.materials ?? []).map((material) =>
    accessedMaterialIds.includes(material.id)
      ? { ...material, completed: true }
      : material
  );
  const preTestCompleted = Boolean(data.training?.pre_test_completed);

  async function openMaterial(event, material) {
    event.preventDefault();

    const file = material.files?.[0];
    if (!file?.file_path) return;

    try {
      await materialService.markMaterialAccessed(material.id);
      setAccessedMaterialIds((current) =>
        current.includes(material.id) ? current : [...current, material.id]
      );

      await materialService.openMaterialFile(material, file);
    } catch {
      setError("Akses materi gagal dicatat. Silakan coba lagi.");
    }
  }

  return (
    <DashboardLayout role="employee">
      <div className="employee-material-page">
        {error && <p className="employee-material-error" role="alert">{error}</p>}
        <MaterialListCard
          materials={materials}
          disabled={!preTestCompleted}
          onOpenMaterial={openMaterial}
        />
      </div>

      {!loading && !preTestCompleted && <PreTestRequiredDialog />}
    </DashboardLayout>
  );
}

export default EmployeeMaterials;
