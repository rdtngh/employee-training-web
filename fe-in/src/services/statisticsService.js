const dummyStatistics = {
  title: "Statistik",
  message: "Grafik statistik hasil pre-test dan post-test akan ditampilkan di sini.",
  average_score: 0,
  participant_count: 0,
  passed_count: 0,
  failed_count: 0,
  chart: [],
};

export const getStatistics = async () => ({
  ...dummyStatistics,
  chart: [...dummyStatistics.chart],
});
