const dummyStatistics = {
  title: "Statistik",
  training: { id: 1, title: "Pelatihan Keselamatan Pasien" },
  average_score: 78,
  participant_count: 40,
  passed_count: 31,
  failed_count: 9,
  highest_score: 100,
  lowest_score: 45,
  pass_percentage: 77.5,
};

export const getStatistics = async (role) => ({
  ...dummyStatistics,
  role,
  training: { ...dummyStatistics.training },
});
