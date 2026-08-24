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
import Auth from "./pages/Auth";
import Profile from "./pages/Profile.tsx";
import { ChatWidget } from "./components/livora/ChatWidget.tsx";
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
import AdminMarketing from "./pages/admin/AdminMarketing";
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
import AdminSupportChat from "./pages/admin/AdminSupportChat.tsx";
import Register from "./pages/Register.tsx";
import AdminScan from "./pages/admin/AdminScan.tsx";
import AdminItemDetail from "./pages/admin/AdminItemDetail.tsx";
import SalesScan from "./pages/sales/SalesScan.tsx";
import SalesItemDetail from "./pages/sales/SalesItemDetail.tsx";
import RequireRole from "./components/RequireRole.tsx";
import AiMarketingShell from "./pages/admin/ai-marketing/AiMarketingShell";
import AiMarketingOverview from "./pages/admin/ai-marketing/AiMarketingOverview";
import AiMarketingInsights from "./pages/admin/ai-marketing/AiMarketingInsights";
import AiMarketingSeo from "./pages/admin/ai-marketing/AiMarketingSeo";
import AiMarketingContent from "./pages/admin/ai-marketing/AiMarketingContent";
import AiMarketingAds from "./pages/admin/ai-marketing/AiMarketingAds";
import AiMarketingLeads from "./pages/admin/ai-marketing/AiMarketingLeads";
import AiMarketingCro from "./pages/admin/ai-marketing/AiMarketingCro";
import AiMarketingApprovals from "./pages/admin/ai-marketing/AiMarketingApprovals";
import AiMarketingActivity from "./pages/admin/ai-marketing/AiMarketingActivity";
import AiMarketingSettings from "./pages/admin/ai-marketing/AiMarketingSettings";
import AiMarketingRecommendations from "./pages/admin/ai-marketing/AiMarketingRecommendations";
import AiMarketingActions from "./pages/admin/ai-marketing/AiMarketingActions";
import AiMarketingCampaigns from "./pages/admin/ai-marketing/AiMarketingCampaigns";
import AiMarketingCampaignDetail from "./pages/admin/ai-marketing/AiMarketingCampaignDetail";
import AiMarketingImpact from "./pages/admin/ai-marketing/AiMarketingImpact";
import AiMarketingUsage from "./pages/admin/ai-marketing/AiMarketingUsage";
import AiMarketingProviders from "./pages/admin/ai-marketing/AiMarketingProviders";

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
              <Route element={<RequireRole roles={["sales", "admin"]} />}>
                <Route path="/sales/scan" element={<SalesScan />} />
                <Route path="/sales/items/:slug" element={<SalesItemDetail />} />
              </Route>
              <Route path="/dashboard" element={<Dashboard />} />

              {/* Standalone AI Marketing section — own shell/theme, NOT nested inside AdminLayout */}
              <Route path="/admin/ai-marketing" element={<AiMarketingShell />}>
                <Route index element={<AiMarketingOverview />} />
                <Route path="insights" element={<AiMarketingInsights />} />
                <Route path="seo" element={<AiMarketingSeo />} />
                <Route path="content" element={<AiMarketingContent />} />
                <Route path="ads" element={<AiMarketingAds />} />
                <Route path="leads" element={<AiMarketingLeads />} />
                <Route path="cro" element={<AiMarketingCro />} />
                <Route path="ai-center/recommendations" element={<AiMarketingRecommendations />} />
                <Route path="ai-center/actions" element={<AiMarketingActions />} />
                <Route path="campaigns" element={<AiMarketingCampaigns />} />
                <Route path="campaigns/:id" element={<AiMarketingCampaignDetail />} />
                <Route path="impact" element={<AiMarketingImpact />} />
                <Route path="usage" element={<AiMarketingUsage />} />
                <Route path="providers" element={<AiMarketingProviders />} />
                <Route path="approvals" element={<AiMarketingApprovals />} />
                <Route path="activity" element={<AiMarketingActivity />} />
                <Route path="settings" element={<AiMarketingSettings />} />
              </Route>

              <Route path="/admin" element={<AdminLayout />}>
               <Route path="consultations" element={<AdminConsultations />} />
               <Route path="consultations/:id" element={<AdminConsultationDetail />} />
               <Route path="wishlists" element={<AdminWishlists />} />
               <Route path="support" element={<AdminSupportChat />} />
              <Route path="catalogs"          element={<CatalogListAdmin />} />
                <Route path="catalogs/create"   element={<CatalogFormAdmin />} />
                <Route path="catalogs/:id/edit" element={<CatalogFormAdmin />} />
                <Route index element={<AdminOverview />} />
                <Route path="projects" element={<AdminProjects />} />
                <Route path="items" element={<AdminItems />} />
                <Route path="items/:id/experience" element={<AdminItemExperience />} />
                <Route path="items/:slug/detail" element={<AdminItemDetail />} />
                <Route path="scan" element={<AdminScan />} />
                <Route path="collections" element={<AdminCollections />} />
                <Route path="taxonomies" element={<AdminTaxonomies />} />
                <Route path="landing" element={<AdminLanding />} />
                <Route path="analytics" element={<AdminAnalytics />} />
                <Route path="banners" element={<AdminBanners />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="marketing" element={<AdminMarketing />} />
                
              </Route>
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <CartDrawer />
            <ChatWidget />
            {/* <WhatsAppButton /> */}
          </BrowserRouter>
        </CartProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
