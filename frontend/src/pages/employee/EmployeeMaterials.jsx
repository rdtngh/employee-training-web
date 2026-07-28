import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import MaterialListCard from "../../components/employee/MaterialListCard";
import PreTestRequiredDialog from "../../components/employee/PreTestRequiredDialog";
import TrainingSelectionCard from "../../components/employee/TrainingSelectionCard";
import * as materialService from "../../services/materialService";
import * as trainingService from "../../services/trainingService";
import "./EmployeeMaterials.css";

function EmployeeMaterials() {
  const navigate = useNavigate();
  const { trainingId } = useParams();
  const [trainings, setTrainings] = useState([]);
  const [trainingLoading, setTrainingLoading] = useState(true);
  const [trainingError, setTrainingError] = useState("");
  const [data, setData] = useState({ training: null, materials: [] });
  const [loading, setLoading] = useState(false);
  const [accessedMaterialIds, setAccessedMaterialIds] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    trainingService
      .getTrainings()
      .then((data) => {
        if (active) setTrainings(data);
      })
      .catch(() => {
        if (active) setTrainingError("Daftar pelatihan gagal dimuat.");
      })
      .finally(() => {
        if (active) setTrainingLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!trainingId) return undefined;

    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      setLoading(true);
      setData({ training: null, materials: [] });
      setError("");
      setAccessedMaterialIds([]);

      materialService
        .getMaterials(trainingId)
        .then((data) => {
          if (active) setData(data);
        })
        .catch(() => {
          if (active) setError("Materi pelatihan gagal dimuat.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      });

    return () => {
      active = false;
    };
  }, [trainingId]);

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
        {!trainingId ? (
          <TrainingSelectionCard
            title="Materi"
            trainings={trainings}
            loading={trainingLoading}
            error={trainingError}
            actionLabel="Lihat Materi"
            onSelectTraining={(training) => navigate(`/employee/materi/${training.id}`)}
          />
        ) : (
          <>
            <MaterialListCard
              title={data.training?.title ? `Materi ${data.training.title}` : "Daftar Materi"}
              materials={loading ? [] : materials}
              disabled={!preTestCompleted}
              onOpenMaterial={openMaterial}
              emptyMessage={loading ? "Memuat materi..." : "Belum ada materi pada pelatihan ini."}
            />
            <button
              type="button"
              className="employee-training-back"
              onClick={() => navigate("/employee/materi")}
            >
              &larr; Back
            </button>
          </>
        )}
      </div>

      {trainingId && !loading && !preTestCompleted && <PreTestRequiredDialog />}
    </DashboardLayout>
  );
}

export default EmployeeMaterials;
