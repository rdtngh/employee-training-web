export const menuConfig = {
  superadmin: [
    {
      name: "Dashboard",
      path: "/superadmin/dashboard",
    },
    {
      name: "Kelola User",
      path: "/superadmin/users",
    },
    {
      name: "Kelola Pelatihan",
      path: "/superadmin/trainings",
    },
    {
      name: "Kelola Materi",
      path: "/superadmin/materials",
    },
    {
      name: "Kelola Ujian",
      path: "/superadmin/exams",
    },
  ],

  admin: [
    {
      name: "Dashboard",
      path: "/admin/dashboard",
    },
    {
      name: "Kelola Pelatihan",
      path: "/admin/trainings",
    },
    {
      name: "Kelola Materi",
      path: "/admin/materials",
    },
    {
      name: "Kelola Ujian",
      path: "/admin/exams",
    },
  ],

  employee: [
    {
      name: "Dashboard",
      path: "/employee/dashboard",
    },
    {
      name: "Pelatihan",
      path: "/employee/trainings",
    },
    {
      name: "Materi",
      path: "/employee/materials",
    },
    {
      name: "Pre Test",
      path: "/employee/pretest",
    },
    {
      name: "Post Test",
      path: "/employee/posttest",
    },
  ],
};