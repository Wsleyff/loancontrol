"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({
  children,
}: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth > 900) {
        setMobileMenuOpen(false);
      }
    }

    window.addEventListener(
      "resize",
      handleResize
    );

    return () => {
      window.removeEventListener(
        "resize",
        handleResize
      );
    };
  }, []);

  useEffect(() => {
    if (mobileMenuOpen && window.innerWidth <= 900) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        background: "#f8fafc",
        overflowX: "hidden",
      }}
    >
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() =>
          setMobileMenuOpen(false)
        }
      />

      <div
        className="loancontrol-main-content"
        style={{
          minHeight: "100vh",
          marginLeft: "250px",
          width: "calc(100% - 250px)",
        }}
      >
        <Header
          onMobileMenuOpen={() =>
            setMobileMenuOpen(true)
          }
        />

        <main
          style={{
            width: "100%",
            maxWidth: "1800px",
            margin: "0 auto",
            padding: "24px",
          }}
        >
          {children}
        </main>
      </div>

      <style jsx>{`
        .loancontrol-main-content {
          transition: margin-left 0.2s ease;
        }

        @media (max-width: 1200px) {
          .loancontrol-main-content {
            margin-left: 230px !important;
            width: calc(100% - 230px) !important;
          }
        }

        @media (max-width: 900px) {
          .loancontrol-main-content {
            margin-left: 0 !important;
            width: 100% !important;
          }
        }

        @media (max-width: 900px) {
          main {
            padding: 16px !important;
          }
        }

        @media (max-width: 600px) {
          main {
            padding: 12px !important;
          }
        }

        @media (max-width: 380px) {
          main {
            padding: 10px !important;
          }
        }
      `}</style>
    </div>
  );
}