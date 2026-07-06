import Sidebar from "../components/layout/Sidebar";

function DashboardLayout({ children }) {
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
      }}
    >
      <Sidebar />

      <main
        style={{
          flex: 1,
          padding: "24px",
        }}
      >
        {children}
      </main>
    </div>
  );
}

export default DashboardLayout;