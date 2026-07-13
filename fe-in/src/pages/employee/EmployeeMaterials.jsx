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

  const preTestCompleted = Boolean(data.training?.pre_test_completed);

  return (
    <DashboardLayout role="employee">
      <div className="employee-material-page">
        <MaterialListCard
          materials={data.materials ?? []}
          disabled={!preTestCompleted}
        />
      </div>

      {!loading && !preTestCompleted && <PreTestRequiredDialog />}
    </DashboardLayout>
  );
}

export default EmployeeMaterials;
