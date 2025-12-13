import { Outlet } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { FooterSection } from "@/components/sections/FooterSection";

export default function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <div className="noise-overlay" />
      <Header />
      <main className="flex-1 pt-28">
        <Outlet />
      </main>
      <FooterSection />
    </div>
  );
}
