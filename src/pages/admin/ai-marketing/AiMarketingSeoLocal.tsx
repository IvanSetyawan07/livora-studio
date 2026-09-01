import { IntegrationRequired } from "@/components/ai/integration-required";
import { SectionHeading } from "@/components/ai/primitives";

/** Local SEO block (reviews, rankings, map presence) reused by the SEO agent page. */
export function LocalSeoSection() {
  return (
    <section className="mt-10">
      <SectionHeading
        title="Local SEO — reviews & rankings"
        description="Map views, direction requests, calls dan posisi local pack untuk listing Livora."
      />
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
    </section>
  );
}
