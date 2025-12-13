import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

/* Core pages */
import PlatformPage from "@/pages/Platform";
import GeneratorPage from "@/pages/Generator";
import GalleryPage from "@/pages/Gallery";
import PortfoliosPage from "@/pages/Portfolios";
import ThemesPage from "@/pages/Themes";
import ResourcesPage from "@/pages/Resources";
import DocumentationPage from "@/pages/Documentation";
import ApiPage from "@/pages/Api";
import TemplatesPage from "@/pages/Templates";
import TemplateDetailPage from "@/pages/TemplateDetail";
import TemplatePreviewPage from "@/pages/TemplatePreview";
import SupportPage from "@/pages/Support";
import CompanyPage from "@/pages/Company";
import AboutPage from "@/pages/About";
import BlogPage from "@/pages/Blog";
import BlogPostPage from "@/pages/BlogPost";
import CareersPage from "@/pages/Careers";
import ContactPage from "@/pages/Contact";

/* Public site rendering */
import SitePage from "@/pages/Site";

/* Layout */
import MainLayout from "@/components/layout/MainLayout";
import NotFound from "@/pages/NotFound";
import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import Portfolio from "@/pages/Portfolio";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route element={<MainLayout />}>
                  {/* Default landing routes */}
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />

                  {/* Primary product navigation */}
                  <Route path="/platform" element={<PlatformPage />} />
                  <Route path="/generator" element={<GeneratorPage />} />
                  <Route path="/gallery" element={<GalleryPage />} />
                  <Route path="/portfolios" element={<PortfoliosPage />} />
                  <Route path="/themes" element={<ThemesPage />} />
                  <Route path="/templates" element={<TemplatesPage />} />
                  <Route path="/templates/:slug" element={<TemplateDetailPage />} />
                  <Route path="/templates/:slug/preview" element={<TemplatePreviewPage />} />

                  {/* Knowledge / support */}
                  <Route path="/resources" element={<ResourcesPage />} />
                  <Route path="/docs" element={<DocumentationPage />} />
                  <Route path="/api" element={<ApiPage />} />
                  <Route path="/support" element={<SupportPage />} />

                  {/* Company */}
                  <Route path="/company" element={<CompanyPage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/blog" element={<BlogPage />} />
                  <Route path="/blog/:slug" element={<BlogPostPage />} />
                  <Route path="/careers" element={<CareersPage />} />
                  <Route path="/contact" element={<ContactPage />} />

                  {/* Public generated websites */}
                  <Route path="/site/:slug" element={<SitePage />} />

                  {/* Legacy/extra routes still available */}
                  <Route path="/portfolio/:slug" element={<Portfolio />} />
                  <Route path="/home" element={<Index />} />

                  {/* Hard fallback — no white screens */}
                  <Route
                    path="*"
                    element={
                      <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">
                        Page not found.
                      </div>
                    }
                  />
                </Route>
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
