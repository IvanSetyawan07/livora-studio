import { lazy, Suspense } from "react";
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
import { ForgotPassword, ResetPassword } from "./pages/PasswordReset";
import Profile from "./pages/Profile.tsx";
import MyConsultationDetail from "./pages/MyConsultationDetail.tsx";
import { ChatWidget } from "./components/livora/ChatWidget.tsx";
import ScrollToTop from "./components/ScrollToTop.tsx";
import SmoothScroll from "./components/SmoothScroll.tsx";
import HeroPreloader from "./components/livora/HeroPreloader.tsx";
import Furniture from "./pages/Furniture.tsx";
import FurnitureFilter from "./pages/FurnitureFilter.tsx";
import { CartDrawer } from "@/components/livora/CartDrawer.tsx";
import { CartProvider } from "./context/CartContext.tsx";
import CatalogPage from "./pages/CatalogPage";
import CatalogDetail from "./pages/CatalogDetail"; // ← tambah ini
import CollectionLanding from "./pages/CollectionLanding.tsx";
import CollectionDetail from "./pages/CollectionDetail.tsx";
import CollectionCategory from "./pages/CollectionCategory.tsx";
import Appointment from "./pages/Appointment.tsx";
import RequireRole from "./components/RequireRole.tsx";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Cart = lazy(() => import("./pages/Cart"));
const OrderWhatsApp = lazy(() => import("./pages/OrderWhatsApp"));
const MyOrderDetail = lazy(() => import("./pages/MyOrderDetail"));
const OrderForm = lazy(() => import("./pages/OrderForm"));
const AdminShopOrders = lazy(() => import("./pages/admin/shop/AdminShopOrders"));
const AdminShopOrderDetail = lazy(() => import("./pages/admin/shop/AdminShopOrderDetail"));
const AdminShopPayments = lazy(() => import("./pages/admin/shop/AdminShopPayments"));
const AdminShopInbox = lazy(() => import("./pages/admin/shop/AdminShopInbox"));
const AdminShopAftercare = lazy(() => import("./pages/admin/shop/AdminShopAftercare"));
const AdminShopSettings = lazy(() => import("./pages/admin/shop/AdminShopSettings"));
const AdminShopHealth = lazy(() => import("./pages/admin/shop/AdminShopHealth"));
const AdminShopBotSimulator = lazy(() => import("./pages/admin/shop/AdminShopBotSimulator"));
const AdminShopScan = lazy(() => import("./pages/admin/shop/AdminShopScan"));
const AdminShopDatabase = lazy(() => import("./pages/admin/shop/AdminShopDatabase"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminOverview = lazy(() => import("./pages/admin/AdminOverview"));
const AdminProjects = lazy(() => import("./pages/admin/AdminProjects"));
const AdminItems = lazy(() => import("./pages/admin/AdminItems"));
const AdminCollections = lazy(() => import("./pages/admin/AdminCollections"));
const AdminItemExperience = lazy(() => import("./pages/admin/AdminItemExperience"));
const AdminTaxonomies = lazy(() => import("./pages/admin/AdminTaxonomies"));
const AdminLanding = lazy(() => import("./pages/admin/AdminLanding"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminBanners = lazy(() => import("./pages/admin/AdminBanners"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminMarketing = lazy(() => import("./pages/admin/AdminMarketing"));
const ERD = lazy(() => import("./pages/ERD"));
const CatalogListAdmin = lazy(() => import("@/pages/admin/CatalogListAdmin"));
const CatalogFormAdmin = lazy(() => import("@/pages/admin/CatalogFormAdmin"));
const AdminConsultations = lazy(() => import("./pages/admin/AdminConsultations.tsx"));
const AdminConsultationDetail = lazy(() => import("./pages/admin/AdminConsultationDetail.tsx"));
const AdminWishlists = lazy(() => import("./pages/admin/AdminWishlists.tsx"));
const AdminSupportChat = lazy(() => import("./pages/admin/AdminSupportChat.tsx"));
const AdminScan = lazy(() => import("./pages/admin/AdminScan.tsx"));
const AdminItemDetail = lazy(() => import("./pages/admin/AdminItemDetail.tsx"));
const SalesScan = lazy(() => import("./pages/sales/SalesScan.tsx"));
const SalesItemDetail = lazy(() => import("./pages/sales/SalesItemDetail.tsx"));
const AiMarketingShell = lazy(() => import("./pages/admin/ai-marketing/AiMarketingShell"));
const AiMarketingOverview = lazy(() => import("./pages/admin/ai-marketing/AiMarketingOverview"));
const AiMarketingInsights = lazy(() => import("./pages/admin/ai-marketing/AiMarketingInsights"));
const AiMarketingSeo = lazy(() => import("./pages/admin/ai-marketing/AiMarketingSeo"));
const AiMarketingContent = lazy(() => import("./pages/admin/ai-marketing/AiMarketingContent"));
const AiMarketingAds = lazy(() => import("./pages/admin/ai-marketing/AiMarketingAds"));
const AiMarketingLeads = lazy(() => import("./pages/admin/ai-marketing/AiMarketingLeads"));
const AiMarketingCro = lazy(() => import("./pages/admin/ai-marketing/AiMarketingCro"));
const AiMarketingApprovals = lazy(() => import("./pages/admin/ai-marketing/AiMarketingApprovals"));
const AiMarketingActivity = lazy(() => import("./pages/admin/ai-marketing/AiMarketingActivity"));
const AiMarketingSettings = lazy(() => import("./pages/admin/ai-marketing/AiMarketingSettings"));
const AiMarketingRecommendations = lazy(() => import("./pages/admin/ai-marketing/AiMarketingRecommendations"));
const AiMarketingActions = lazy(() => import("./pages/admin/ai-marketing/AiMarketingActions"));
const AiMarketingCampaigns = lazy(() => import("./pages/admin/ai-marketing/AiMarketingCampaigns"));
const AiMarketingCampaignDetail = lazy(() => import("./pages/admin/ai-marketing/AiMarketingCampaignDetail"));
const AiMarketingImpact = lazy(() => import("./pages/admin/ai-marketing/AiMarketingImpact"));
const AiMarketingUsage = lazy(() => import("./pages/admin/ai-marketing/AiMarketingUsage"));
const AiMarketingProviders = lazy(() => import("./pages/admin/ai-marketing/AiMarketingProviders"));

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
            <Suspense fallback={null}>
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
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/:tab" element={<Profile />} />
              <Route path="/profile/consultations/:id" element={<MyConsultationDetail />} />
              <Route path="/profile/orders/:code" element={<MyOrderDetail />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/order/:code/whatsapp" element={<OrderWhatsApp />} />
              <Route path="/order-form/:code" element={<OrderForm />} />
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
                <Route path="shop/orders" element={<AdminShopOrders />} />
                <Route path="shop/orders/:code" element={<AdminShopOrderDetail />} />
                <Route path="shop/payments" element={<AdminShopPayments />} />
                <Route path="shop/database" element={<AdminShopDatabase />} />
                <Route path="shop/scan" element={<AdminShopScan />} />
                <Route path="shop/inbox" element={<AdminShopInbox />} />
                <Route path="shop/aftercare" element={<AdminShopAftercare />} />
                <Route path="shop/settings" element={<AdminShopSettings />} />
                <Route path="shop/health" element={<AdminShopHealth />} />
                <Route path="shop/bot-simulator" element={<AdminShopBotSimulator />} />
                
              </Route>
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
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
