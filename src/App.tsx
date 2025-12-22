import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import Site from "@/pages/Site";
import SiteEditor from "@/pages/SiteEditor";
import PublicPortfolio from "@/pages/PublicPortfolio";
import NotFound from "@/pages/NotFound";
import ThemesPage from "@/pages/Themes";
import BlogPage from "@/pages/Blog";
import BlogPostPage from "@/pages/BlogPost";
import GalleryPage from "@/pages/Gallery";
import { Header } from "@/components/layout/Header";
import { PrescriptiveChatProvider } from "@/components/chat/PrescriptiveChatProvider";
import { ChatLauncher } from "@/components/chat/ChatLauncher";
import { PrescriptiveDebugPanel } from "@/components/chat/PrescriptiveDebugPanel";

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-28">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <PrescriptiveChatProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />

          {/* Public website */}
          <Route path="/site/:slug" element={<Site />} />

          {/* Owner editor */}
          <Route path="/site/:slug/edit" element={<SiteEditor />} />

          {/* Public portfolio */}
          <Route path="/portfolio/:username" element={<PublicPortfolio />} />

          {/* Themes & blog */}
          <Route
            path="/themes"
            element={
              <PageShell>
                <ThemesPage />
              </PageShell>
            }
          />
          <Route
            path="/gallery"
            element={
              <PageShell>
                <GalleryPage />
              </PageShell>
            }
          />
          <Route
            path="/blog"
            element={
              <PageShell>
                <BlogPage />
              </PageShell>
            }
          />
          <Route
            path="/blog/:slug"
            element={
              <PageShell>
                <BlogPostPage />
              </PageShell>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      <ChatLauncher />
      <PrescriptiveDebugPanel />
    </PrescriptiveChatProvider>
  );
}
