/**
 * Demo datasets for the AI Marketing dashboards (social, ads, local SEO,
 * operations / email follow-up). These are static demo numbers so the UI
 * renders complete — swap each export for a Laravel API call later.
 */

/* ---------------------------------------------------------------- */
/* Social — Performance tracking                                     */
/* ---------------------------------------------------------------- */

export const socialKpis = [
  { label: "Total followers", value: "48187", delta: "1,248 this month", direction: "up" as const },
  { label: "Posts this month", value: "34", delta: "6 vs last month", direction: "up" as const },
  { label: "Avg engagement rate", value: "7.4%", delta: "1.1pt this month", direction: "up" as const },
  { label: "Top platform", value: "Instagram", delta: "41% of engagement", direction: "up" as const },
];

const socialDays = 30;
function ramp(start: number, end: number, wobble: number, seed: number) {
  return Array.from({ length: socialDays }, (_, i) => {
    const t = i / (socialDays - 1);
    const noise = Math.sin((i + seed) * 1.7) * wobble;
    return Math.max(0, Math.round(start + (end - start) * t + noise));
  });
}

const instagram = ramp(120, 460, 22, 1);
const facebook = ramp(95, 300, 18, 3);
const tiktok = ramp(70, 250, 16, 5);
const youtube = ramp(45, 165, 12, 7);

export const socialEngagementSeries = Array.from({ length: socialDays }, (_, i) => ({
  label: `D${i + 1}`,
  instagram: instagram[i],
  facebook: facebook[i],
  tiktok: tiktok[i],
  youtube: youtube[i],
}));

export const socialSeriesConfig = [
  { key: "instagram", label: "Instagram", color: "hsl(var(--chart-1))" },
  { key: "facebook", label: "Facebook", color: "hsl(var(--chart-2))" },
  { key: "tiktok", label: "TikTok", color: "hsl(var(--chart-3))" },
  { key: "youtube", label: "YouTube", color: "hsl(var(--chart-4))" },
];

export const postsByPlatform = [
  { label: "IG", value: 14, color: "hsl(var(--chart-1))" },
  { label: "FB", value: 11, color: "hsl(var(--chart-2))" },
  { label: "TikTok", value: 6, color: "hsl(var(--chart-3))" },
  { label: "YouTube", value: 3, color: "hsl(var(--chart-4))" },
];

export const socialStats = [
  { value: "214", label: "avg likes / post" },
  { value: "18", label: "avg comments" },
  { value: "3.1K", label: "best reach" },
];

/* ---------------------------------------------------------------- */
/* Ads — Campaign performance                                        */
/* ---------------------------------------------------------------- */

export const adsKpis = [
  { label: "Total ad spend (30d)", value: "Rp. 4,798", delta: "within budget", direction: "up" as const },
  { label: "Leads generated", value: "163", delta: "31% vs last month", direction: "up" as const },
  { label: "Cost per lead", value: "Rp. 29", delta: "12% vs last month", direction: "down" as const },
  { label: "Return on ad spend", value: "4.2x", delta: "0.6x vs last month", direction: "up" as const },
];

const adDays = 30;
export const adsSeries = Array.from({ length: adDays }, (_, i) => {
  const t = i / (adDays - 1);
  return {
    label: `D${i + 1}`,
    impressions: Math.round(180 + 420 * t + Math.sin(i * 1.3) * 30),
    clicks: Math.round(120 + 300 * t + Math.sin(i * 0.9) * 24),
    conversions: Math.round(60 + 210 * t + Math.sin(i * 1.6) * 18),
    spend: Math.round(90 + 250 * t + Math.sin(i * 1.1) * 20),
  };
});

export const adsSeriesConfig = [
  { key: "impressions", label: "Impressions", color: "hsl(var(--chart-2))" },
  { key: "clicks", label: "Clicks", color: "hsl(var(--chart-3))" },
  { key: "conversions", label: "Conversions", color: "hsl(var(--chart-1))" },
  { key: "spend", label: "Ad Spend", color: "hsl(var(--chart-5))" },
];

export const spendByPlatform = [
  { label: "Google", value: 2140, color: "hsl(var(--chart-2))" },
  { label: "Meta", value: 1460, color: "hsl(var(--chart-1))" },
  { label: "Instagram", value: 820, color: "hsl(var(--chart-3))" },
  { label: "YouTube", value: 378, color: "hsl(var(--chart-4))" },
];

export const adsFunnel = [
  { label: "Impressions", value: 184200, tone: "info" as const },
  { label: "Clicks", value: 7340, tone: "info" as const },
  { label: "Landing views", value: 5120, tone: "brass" as const },
  { label: "Leads", value: 163, tone: "success" as const },
];

/* ---------------------------------------------------------------- */
/* Local SEO — Reviews & rankings                                    */
/* ---------------------------------------------------------------- */

export const localSeoKpis = [
  { label: "Map views (30d)", value: "5240", delta: "18% vs last month", direction: "up" as const },
  { label: "Direction requests", value: "312", delta: "9% vs last month", direction: "up" as const },
  { label: "Calls from listing", value: "97", delta: "14% vs last month", direction: "up" as const },
  { label: "Local pack rank", value: "#3", delta: "from #4", direction: "up" as const },
];

export const reviewsBreakdown = [
  { label: "5★", value: 148, color: "hsl(var(--success))" },
  { label: "4★", value: 46, color: "hsl(var(--chart-3))" },
  { label: "3★", value: 12, color: "hsl(var(--warning))" },
  { label: "2★", value: 4, color: "hsl(var(--chart-4))" },
  { label: "1★", value: 2, color: "hsl(var(--destructive))" },
];

export const rankingSeries = Array.from({ length: 12 }, (_, i) => ({
  label: `W${i + 1}`,
  livora: Math.max(1, Math.round(8 - i * 0.45 + Math.sin(i) * 0.6)),
  competitorA: Math.max(1, Math.round(5 + Math.sin(i * 1.2) * 1.2)),
  competitorB: Math.max(1, Math.round(7 + Math.cos(i * 0.9) * 1.4)),
}));

export const rankingSeriesConfig = [
  { key: "livora", label: "Livora", color: "hsl(var(--chart-1))" },
  { key: "competitorA", label: "Competitor A", color: "hsl(var(--chart-2))" },
  { key: "competitorB", label: "Competitor B", color: "hsl(var(--chart-3))" },
];

/* ---------------------------------------------------------------- */
/* Operations — Email & follow-up                                    */
/* ---------------------------------------------------------------- */

export const opsKpis = [
  { label: "Active sequences", value: "58", delta: "12 started today", direction: "up" as const },
  { label: "Avg response time", value: "9s", delta: "industry avg 42 min", direction: "down" as const },
  { label: "Response rate", value: "64%", delta: "7pt vs last month", direction: "up" as const },
  { label: "Leads recovered", value: "27", delta: "from follow-up alone", direction: "up" as const },
];

export const followUpSteps = [
  { label: "Step 1", value: 64, color: "hsl(var(--chart-2))" },
  { label: "Step 2", value: 41, color: "hsl(var(--chart-2))" },
  { label: "Step 3", value: 28, color: "hsl(var(--chart-2))" },
  { label: "Step 4", value: 17, color: "hsl(var(--chart-2))" },
  { label: "Step 5", value: 9, color: "hsl(var(--chart-2))" },
];

export const emailFunnel = [
  { label: "Sent", value: 312, tone: "info" as const },
  { label: "Opened", value: 221, tone: "info" as const },
  { label: "Clicked", value: 119, tone: "brass" as const },
  { label: "Responded", value: 64, tone: "success" as const },
];

export type FollowUpLead = {
  id: string;
  name: string;
  status: "Responded" | "In Sequence" | "Recovered";
  steps: { title: string; note: string; state: "done" | "active" | "pending" }[];
};

export const followUpLeads: FollowUpLead[] = [
  {
    id: "lead-1",
    name: "Maria Kensington",
    status: "Responded",
    steps: [
      { title: "Initial inquiry received", note: "Kitchen remodel quote request", state: "done" },
      { title: "Instant AI reply sent", note: "Answered in 8 seconds", state: "done" },
      { title: "Follow-up #1", note: "Shared catalogue + availability", state: "done" },
      { title: "Lead responded", note: "Booked a showroom visit", state: "done" },
    ],
  },
  {
    id: "lead-2",
    name: "James O'Connell",
    status: "In Sequence",
    steps: [
      { title: "Initial inquiry received", note: "Deck installation inquiry", state: "done" },
      { title: "Instant AI reply sent", note: "Answered in 11 seconds", state: "done" },
      { title: "Follow-up #2 scheduled", note: "Sends tomorrow, 09:00", state: "active" },
      { title: "Handover to sales", note: "Waiting on reply", state: "pending" },
    ],
  },
];
