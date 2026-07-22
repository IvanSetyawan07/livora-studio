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
import Auth from "./pages/Auth";
import Profile from "./pages/Profile.tsx";
// import Login from "./pages/Login";
// import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminProjects from "./pages/admin/AdminProjects";
import AdminItems from "./pages/admin/AdminItems";
import AdminCollections from "./pages/admin/AdminCollections";
import AdminItemExperience from "./pages/admin/AdminItemExperience";
import AdminTaxonomies from "./pages/admin/AdminTaxonomies";
import AdminLanding from "./pages/admin/AdminLanding";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminBanners from "./pages/admin/AdminBanners";
import AdminUsers from "./pages/admin/AdminUsers";
import ScrollToTop from "./components/ScrollToTop.tsx";
import SmoothScroll from "./components/SmoothScroll.tsx";
import HeroPreloader from "./components/livora/HeroPreloader.tsx";
import ERD from "./pages/ERD";
import Furniture from "./pages/Furniture.tsx";
import FurnitureFilter from "./pages/FurnitureFilter.tsx";
import { CartDrawer } from "@/components/livora/CartDrawer.tsx";
import { CartProvider } from "./context/CartContext.tsx";
import CatalogPage from "./pages/CatalogPage";
import CatalogDetail from "./pages/CatalogDetail"; // ← tambah ini
import CatalogListAdmin from "@/pages/admin/CatalogListAdmin";
import CatalogFormAdmin from "@/pages/admin/CatalogFormAdmin";
import CollectionLanding from "./pages/CollectionLanding.tsx";
import CollectionDetail from "./pages/CollectionDetail.tsx";
import CollectionCategory from "./pages/CollectionCategory.tsx";
import Appointment from "./pages/Appointment.tsx";
import AdminConsultations from "./pages/admin/AdminConsultations.tsx";
import AdminConsultationDetail from "./pages/admin/AdminConsultationDetail.tsx";
import AdminWishlists from "./pages/admin/AdminWishlists.tsx";
import Register from "./pages/Register.tsx";


const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <CartProvider>
          <BrowserRouter>
            <HeroPreloader />
            <ScrollToTop />
            <SmoothScroll />
            <Routes>
              <Route path="/erd" element={<ERD />} />
              <Route path="/" element={<Index />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/:slug" element={<ProjectDetail />} />
              <Route path="/items/:slug" element={<ItemDetail />} />
              <Route path="/furniture" element={<Furniture />} />
              <Route path="/furniture/:kind/:slug" element={<FurnitureFilter />} />
              <Route path="/catalog" element={<CatalogPage />} />
              <Route path="/catalog/:category" element={<CatalogPage />} />
              <Route path="/catalog/:category/:slug" element={<CatalogDetail />} /> {/* ← tambah ini */}
              <Route path="/collection" element={<CollectionLanding />} />
              <Route path="/collection/:slug" element={<CollectionDetail />} />
              <Route path="/collection/:slug/:category" element={<CollectionCategory />} />
              <Route path="/appointment" element={<Appointment />} />
              <Route path="/login" element={<Auth />} />
              <Route path="/register" element={<Auth />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/admin" element={<AdminLayout />}>
               <Route path="consultations" element={<AdminConsultations />} />
               <Route path="consultations/:id" element={<AdminConsultationDetail />} />
               <Route path="wishlists" element={<AdminWishlists />} />
              <Route path="catalogs"          element={<CatalogListAdmin />} />
                <Route path="catalogs/create"   element={<CatalogFormAdmin />} />
                <Route path="catalogs/:id/edit" element={<CatalogFormAdmin />} />
                <Route index element={<AdminOverview />} />
                <Route path="projects" element={<AdminProjects />} />
                <Route path="items" element={<AdminItems />} />
                <Route path="items/:id/experience" element={<AdminItemExperience />} />
                <Route path="collections" element={<AdminCollections />} />
                <Route path="taxonomies" element={<AdminTaxonomies />} />
                <Route path="landing" element={<AdminLanding />} />
                <Route path="analytics" element={<AdminAnalytics />} />
                <Route path="banners" element={<AdminBanners />} />
                <Route path="users" element={<AdminUsers />} />
                
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