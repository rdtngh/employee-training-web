import DashboardLayout from "../../components/dashboard/DashboardLayout";
import StatisticsDashboard from "../../components/statistics/StatisticsDashboard";
import * as statisticsService from "../../services/statisticsService";
import * as trainingService from "../../services/trainingService";
import { useCallback, useEffect, useState } from "react";

function StatisticsPage() {
  const [trainings, setTrainings] = useState([]);
  const [selectedTrainingId, setSelectedTrainingId] = useState("");
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [trainingLoading, setTrainingLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    trainingService
      .getTrainings()
      .then((data) => {
        if (!active) return;
        setTrainings(data);
        setSelectedTrainingId((current) => current || String(data[0]?.id ?? ""));
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
      .getStatistics({ role: "admin", trainingId: selectedTrainingId })
      .then(setStatistics)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [selectedTrainingId]);

  const handleTrainingChange = (trainingId) => {
    setSelectedTrainingId(trainingId);
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
        .getStatistics({ role: "admin", trainingId: selectedTrainingId })
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
    <DashboardLayout role="admin">
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
