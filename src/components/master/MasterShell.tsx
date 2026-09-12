import { MasterSidebar } from "./MasterSidebar";

export function MasterShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <MasterSidebar />

      <main
        style={{
          marginLeft: 260,
          minHeight: "100vh",
          background:
            "linear-gradient(135deg,#f8fafc 0%,#eef2ff 100%)",
          color: "#0f172a",
        }}
      >
        {children}
      </main>
    </>
  );
}