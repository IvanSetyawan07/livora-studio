import { MapPin, Star, PhoneCall, Navigation } from "lucide-react";
import { IntegrationRequired } from "@/components/ai/integration-required";
import { LockedKpiCard, OfflinePanel, PlatformRow, TableShell } from "@/components/ai/offline";
import { SectionHeading } from "@/components/ai/primitives";

/** Local SEO block (reviews, rankings, map presence) reused by the SEO agent page. */
export function LocalSeoSection() {
  return (
    <section className="mt-10">
      <SectionHeading
        title="Local SEO — reviews & rankings"
        description="Map views, direction requests, calls dan posisi local pack untuk listing Livora. Kerangka tampil penuh; angka baru terisi setelah Google Business Profile tersambung."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <LockedKpiCard label="Map Views" provider="Google Business Profile" index={0} />
        <LockedKpiCard label="Direction Requests" provider="Google Business Profile" index={1} />
        <LockedKpiCard label="Calls" provider="Google Business Profile" index={2} />
        <LockedKpiCard label="Avg Rating" provider="Google Business Profile" index={3} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <OfflinePanel
          title="Local Pack Position (30 Days)"
          provider="Google Business Profile API"
          message="Tren posisi local pack untuk keyword utama muncul setelah GOOGLE_BUSINESS_ACCOUNT_ID dan GOOGLE_BUSINESS_LOCATION_ID diisi di backend/.env."
          legend={[
            { label: "Local pack", className: "bg-success" },
            { label: "Map views", className: "bg-info" },
          ]}
        />
        <div className="space-y-2.5">
          <PlatformRow icon={MapPin} label="Google Maps listing" note="business.manage scope" />
          <PlatformRow icon={Star} label="Reviews & rating" note="reviews.readonly" />
          <PlatformRow icon={Navigation} label="Direction requests" note="performance API" />
          <PlatformRow icon={PhoneCall} label="Calls from listing" note="performance API" />
        </div>
      </div>

      <div className="mt-4">
        <TableShell
          title="Recent Reviews"
          columns={["Reviewer", "Rating", "Snippet", "Replied", "Date"]}
          emptyTitle="Belum ada review tersinkron"
          emptyDescription="Review ditarik langsung dari listing Google Business Profile. Tidak ada review contoh yang ditampilkan."
          rows={3}
        />
      </div>

      <div className="mt-4">
        <IntegrationRequired
          provider="Google Business Profile"
          title="Google Business Profile API belum tersambung"
          description="Akun Google yang dipakai untuk Search Console belum diberi scope business.manage, jadi data listing (review, map views, panggilan) belum bisa dibaca. Tambahkan scope tersebut lalu connect ulang di kartu Google di atas."
          envKeys={[
            { key: "GOOGLE_MARKETING_CLIENT_ID", note: "sudah ada — dipakai bersama Search Console" },
            { key: "GOOGLE_MARKETING_CLIENT_SECRET", note: "sudah ada" },
            { key: "GOOGLE_BUSINESS_ACCOUNT_ID", note: "accounts/{id} dari Business Profile API" },
            { key: "GOOGLE_BUSINESS_LOCATION_ID", note: "locations/{id} listing Livora" },
          ]}
        />
      </div>
    </section>
  );
}
