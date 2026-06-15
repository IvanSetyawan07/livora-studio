import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import ProjectDetail from "./pages/ProjectDetail.tsx";
import ProjectsPage from "./pages/Projects.tsx";
import ItemDetail from "./pages/ItemDetail.tsx";
import AboutPage from "./pages/About.tsx";
import { WhatsAppButton } from "./components/livora/WhatsAppButton.tsx";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminProjects from "./pages/admin/AdminProjects";
import AdminItems from "./pages/admin/AdminItems";
import AdminTaxonomies from "./pages/admin/AdminTaxonomies";
import AdminLanding from "./pages/admin/AdminLanding";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminBanners from "./pages/admin/AdminBanners";
import ScrollToTop from "./components/ScrollToTop.tsx";
import ERD from "./pages/ERD";
import Furniture from "./pages/Furniture.tsx";
import { CartDrawer } from "@/components/livora/CartDrawer.tsx";
import { CartProvider } from "./context/CartContext.tsx";
import CatalogPage from "./pages/CatalogPage";
import CatalogDetail from "./pages/CatalogDetail"; // ← tambah ini

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <CartProvider>
          <BrowserRouter>
            <ScrollToTop />
            <Routes>
              <Route path="/erd" element={<ERD />} />
              <Route path="/" element={<Index />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/:slug" element={<ProjectDetail />} />
              <Route path="/items/:slug" element={<ItemDetail />} />
              <Route path="/furniture" element={<Furniture />} />
              <Route path="/catalog" element={<CatalogPage />} />
              <Route path="/catalog/:category" element={<CatalogPage />} />
              <Route path="/catalog/:category/:slug" element={<CatalogDetail />} /> {/* ← tambah ini */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminOverview />} />
                <Route path="projects" element={<AdminProjects />} />
                <Route path="items" element={<AdminItems />} />
                <Route path="taxonomies" element={<AdminTaxonomies />} />
                <Route path="landing" element={<AdminLanding />} />
                <Route path="analytics" element={<AdminAnalytics />} />
                <Route path="banners" element={<AdminBanners />} />
              </Route>
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <CartDrawer />
            <WhatsAppButton />
          </BrowserRouter>
        </CartProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;