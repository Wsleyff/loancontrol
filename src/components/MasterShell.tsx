"use client";

import MasterSidebar from "./MasterSidebar";

export default function MasterShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="master-app">
      <MasterSidebar />

      <div className="master-content">
        <header className="master-topbar">
          <div className="master-topbar-left">
            <div className="master-topbar-title">
              Administração
            </div>

            <div className="master-topbar-separator">
              /
            </div>

            <div className="master-topbar-current">
              LoanControl
            </div>
          </div>

          <div className="master-topbar-right">
            <div className="master-online">
              <span className="master-online-dot" />
              Sistema online
            </div>

            <div className="master-badge">
              <span>MASTER</span>
            </div>
          </div>
        </header>

        <main className="master-main">
          {children}
        </main>
      </div>

      <style jsx global>{`
        .master-app {
          min-height: 100vh;
          width: 100%;

          background: #f5f7fb;

          color: #0f172a;
        }

        .master-content {
          min-height: 100vh;

          margin-left: 268px;

          width: calc(100% - 268px);

          box-sizing: border-box;
        }

        .master-topbar {
          position: sticky;
          top: 0;
          z-index: 50;

          height: 68px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          padding: 0 32px;

          box-sizing: border-box;

          background:
            rgba(255, 255, 255, 0.94);

          border-bottom: 1px solid #e5eaf1;

          backdrop-filter: blur(14px);
        }

        .master-topbar-left {
          min-width: 0;

          display: flex;
          align-items: center;

          gap: 10px;
        }

        .master-topbar-title {
          color: #1e293b;

          font-size: 13px;

          font-weight: 800;
        }

        .master-topbar-separator {
          color: #cbd5e1;

          font-size: 13px;
        }

        .master-topbar-current {
          color: #64748b;

          font-size: 12px;

          font-weight: 600;
        }

        .master-topbar-right {
          display: flex;
          align-items: center;

          gap: 14px;
        }

        .master-online {
          display: flex;
          align-items: center;

          gap: 7px;

          color: #64748b;

          font-size: 10px;

          font-weight: 650;
        }

        .master-online-dot {
          width: 7px;
          height: 7px;

          border-radius: 50%;

          background: #22c55e;

          box-shadow:
            0 0 0 3px
            rgba(34, 197, 94, 0.1);
        }

        .master-badge {
          min-width: 72px;
          height: 31px;

          display: flex;
          align-items: center;
          justify-content: center;

          padding: 0 12px;

          border: 1px solid #dbeafe;

          border-radius: 8px;

          background: #eff6ff;

          color: #2563eb;

          font-size: 9px;

          font-weight: 850;

          letter-spacing: 0.08em;
        }

        .master-main {
          width: 100%;

          max-width: 1500px;

          margin: 0 auto;

          padding: 30px 34px 50px;

          box-sizing: border-box;
        }

        @media (max-width: 1100px) {
          .master-topbar {
            padding: 0 24px;
          }

          .master-main {
            padding: 26px 24px 45px;
          }
        }

        @media (max-width: 900px) {
          .master-content {
            margin-left: 0;

            width: 100%;
          }

          .master-topbar {
            padding-left: 70px;
          }

          .master-online {
            display: none;
          }

          .master-main {
            padding: 24px 18px 40px;
          }
        }

        @media (max-width: 560px) {
          .master-topbar-current,
          .master-topbar-separator {
            display: none;
          }

          .master-topbar {
            height: 62px;

            padding-left: 68px;
            padding-right: 14px;
          }

          .master-main {
            padding: 20px 14px 35px;
          }
        }
      `}</style>
    </div>
  );
}