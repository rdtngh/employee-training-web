import DashboardLayout from "../../components/dashboard/DashboardLayout";
import StatisticsDashboard from "../../components/statistics/StatisticsDashboard";
import * as statisticsService from "../../services/statisticsService";
import * as trainingService from "../../services/trainingService";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

function StatisticsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [trainings, setTrainings] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [trainingLoading, setTrainingLoading] = useState(true);
  const [error, setError] = useState(null);
  const queryTrainingId = searchParams.get("training_id") || "";
  const selectedTrainingId = trainings.some(
    (training) => String(training.id) === queryTrainingId
  )
    ? queryTrainingId
    : String(trainings[0]?.id ?? "");

  useEffect(() => {
    let active = true;

    trainingService
      .getTrainings()
      .then((data) => {
        if (!active) return;
        setTrainings(data);
      })
      .catch((error) => {
        if (active) setError(error);
      })
      .finally(() => {
        if (active) setTrainingLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const loadStatistics = useCallback(() => {
    if (!selectedTrainingId) return;
    setLoading(true);
    setError(null);
    statisticsService
      .getStatistics({ role: "superadmin", trainingId: selectedTrainingId })
      .then(setStatistics)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [selectedTrainingId]);

  const handleTrainingChange = (trainingId) => {
    const nextParams = new URLSearchParams(searchParams);

    if (trainingId) {
      nextParams.set("training_id", trainingId);
    } else {
      nextParams.delete("training_id");
    }

    setSearchParams(nextParams, { replace: true });
    setStatistics(null);
    setError(null);
  };

  useEffect(() => {
    if (!selectedTrainingId) return undefined;

    let active = true;

    Promise.resolve().then(() => {
      if (!active) return;
      setLoading(true);
      setError(null);
      statisticsService
        .getStatistics({ role: "superadmin", trainingId: selectedTrainingId })
        .then((data) => {
          if (active) setStatistics(data);
        })
        .catch((error) => {
          if (active) setError(error);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    });

    return () => {
      active = false;
    };
  }, [selectedTrainingId]);

  return (
    <DashboardLayout role="superadmin">
      <StatisticsDashboard
        statistics={statistics}
        loading={loading}
        error={error}
        onReset={loadStatistics}
        canReset
        trainings={trainings}
        selectedTrainingId={selectedTrainingId}
        onTrainingChange={handleTrainingChange}
        trainingLoading={trainingLoading}
      />
    </DashboardLayout>
  );
}

export default StatisticsPage;
