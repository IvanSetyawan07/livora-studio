/**
 * DEMO / PREVIEW FIXTURES — not production data.
 *
 * Every consumer of this module must surface the `DATA_MODE` banner or a
 * "Demo preview" label. Replace these functions with real API calls once the
 * Laravel AI orchestration layer exists (see src/lib/ai/api.ts).
 */
import type {
  AIActivity,
  AIAgent,
  AIApproval,
  AIInsight,
  AIKpi,
  AIRecommendation,
  BusinessHealth,
  ChannelPerformanceItem,
  ContentQueueItem,
  PriorityItem,
  SeoOpportunity,
  TimeseriesPoint,
} from "./types";

export const DATA_MODE = "demo" as const;

export const agents: AIAgent[] = [
  {
    id: "seo",
    name: "SEO Agent",
    purpose: "Analyse organic visibility and identify search opportunities.",
    status: "coming_soon",
    connection: "not_connected",
    lastRun: null,
    tasks: 0,
    insightsCount: 0,
    recommendationsCount: 0,
    pendingApprovals: 0,
    capabilities: [
      "Keyword opportunities",
      "Search Console analysis",
      "Technical SEO",
      "On-page SEO",
      "Content gaps",
      "Internal linking",
      "Schema recommendations",
    ],
    dependencies: [
      { name: "Web Analytics", state: "connected" },
      { name: "Google Search Console", state: "not_connected" },
      { name: "Claude via Laravel API", state: "not_connected" },
    ],
    href: "/admin/ai-marketing/seo",
  },
  {
    id: "content",
    name: "Content Agent",
    purpose: "Turn marketing opportunities into concrete content recommendations.",
    status: "coming_soon",
    connection: "not_connected",
    lastRun: null,
    tasks: 0,
    insightsCount: 0,
    recommendationsCount: 0,
    pendingApprovals: 0,
    capabilities: [
      "Articles",
      "Landing pages",
      "Social content",
      "FAQ",
      "Product copy",
      "Campaign content",
    ],
    dependencies: [
      { name: "Collection & Product Data", state: "connected" },
      { name: "Social publishing APIs", state: "not_connected" },
      { name: "Claude via Laravel API", state: "not_connected" },
    ],
    href: "/admin/ai-marketing/content",
  },
  {
    id: "ads",
    name: "Ads Agent",
    purpose: "Analyse paid performance and recommend budget reallocation.",
    status: "coming_soon",
    connection: "not_connected",
    lastRun: null,
    tasks: 0,
    insightsCount: 0,
    recommendationsCount: 0,
    pendingApprovals: 0,
    capabilities: ["Meta Ads", "Google Ads", "CPL", "CPA", "ROAS", "Creative performance", "Budget pacing"],
    dependencies: [
      { name: "Meta Ads API", state: "not_connected" },
      { name: "Google Ads API", state: "not_connected" },
      { name: "Claude via Laravel API", state: "not_connected" },
    ],
    href: "/admin/ai-marketing/ads",
  },
  {
    id: "leads",
    name: "Lead Intelligence Agent",
    purpose: "Score lead behaviour and surface high-intent enquiries.",
    status: "coming_soon",
    connection: "not_connected",
    lastRun: null,
    tasks: 0,
    insightsCount: 0,
    recommendationsCount: 0,
    pendingApprovals: 0,
    capabilities: [
      "Lead scoring",
      "Behaviour analysis",
      "Product interest",
      "Collection interest",
      "Follow-up priority",
      "Conversion probability",
    ],
    dependencies: [
      { name: "Lead & CRM Data", state: "connected" },
      { name: "Email sequencing", state: "not_connected" },
      { name: "Claude via Laravel API", state: "not_connected" },
    ],
    href: "/admin/ai-marketing/leads",
  },
  {
    id: "cro",
    name: "CRO Agent",
    purpose: "Identify conversion friction across the Livora website.",
    status: "coming_soon",
    connection: "not_connected",
    lastRun: null,
    tasks: 0,
    insightsCount: 0,
    recommendationsCount: 0,
    pendingApprovals: 0,
    capabilities: [
      "Page performance",
      "Funnel drop-off",
      "CTA performance",
      "Product page performance",
      "Lead conversion",
      "UX opportunities",
    ],
    dependencies: [
      { name: "Web Analytics", state: "connected" },
      { name: "Session behaviour capture", state: "not_connected" },
      { name: "Claude via Laravel API", state: "not_connected" },
    ],
    href: "/admin/ai-marketing/cro",
  },
];

export const insights: AIInsight[] = [
  {
    id: "ins_001",
    title: "Serenade collection engagement increased 41%",
    description:
      "Engagement on the Serenade collection is materially above the 30-day category average while organic visibility stays flat.",
    type: "opportunity",
    severity: "high",
    confidence: 87,
    source: ["Web Analytics", "Collection Data"],
    agent: "seo",
    reasoning:
      "Session duration and wishlist adds for Serenade rose over three consecutive weeks while entry pages remained dominated by direct and referral traffic. That gap between demand and search presence usually indicates an unclaimed organic position.",
    whatHappened:
      "Serenade collection views grew 41% across the last 30 days, with average dwell time up from 1m 12s to 2m 04s and wishlist adds up 34%.",
    whyItMatters:
      "Demand exists but is not being captured from search. Supporting editorial content around the collection can compound existing interest into new sessions at no media cost.",
    expectedImpact: "Estimated +8–14% incremental organic sessions to the collection over one quarter.",
    metrics: [
      { label: "Views", value: "2,431", delta: "+41%" },
      { label: "Wishlist", value: "84", delta: "+34%" },
      { label: "Avg. duration", value: "2m 04s", delta: "+72s" },
    ],
    analyticsHref: "/admin/analytics",
    recommendationId: "rec_001",
    createdAt: "2026-08-23T08:22:00Z",
  },
  {
    id: "ins_002",
    title: "Consultation funnel drop-off after step two",
    description:
      "Visitors who open the consultation form abandon disproportionately before the project-detail step.",
    type: "warning",
    severity: "high",
    confidence: 81,
    source: ["Web Analytics", "Lead Data"],
    agent: "cro",
    reasoning:
      "Step completion telemetry shows a 46% fall between the contact step and the project-detail step, well outside the variance of the preceding eight weeks.",
    whatHappened: "Consultation step-two completion fell from 71% to 38% over 14 days.",
    whyItMatters:
      "The consultation funnel is the primary lead source. A third of qualified interest is being lost after intent is already expressed.",
    expectedImpact: "Recovering half the drop-off would return an estimated 9–12 qualified enquiries per month.",
    metrics: [
      { label: "Step 1 → 2", value: "38%", delta: "-33pt" },
      { label: "Abandon time", value: "0m 41s" },
    ],
    analyticsHref: "/admin/analytics",
    recommendationId: "rec_002",
    createdAt: "2026-08-23T08:24:00Z",
  },
  {
    id: "ins_003",
    title: "Catalogue traffic trending up for four consecutive weeks",
    description: "Sustained growth across catalogue entry pages, led by mobile sessions.",
    type: "trend",
    severity: "medium",
    confidence: 92,
    source: ["Web Analytics"],
    agent: "seo",
    reasoning:
      "Weekly sessions to catalogue URLs increased 7–11% each week with no corresponding campaign spend, indicating organic momentum rather than paid lift.",
    whatHappened: "Catalogue sessions grew from 3,180 to 4,402 over four weeks.",
    whyItMatters: "A sustained organic trend is the cheapest surface to expand; it justifies deeper catalogue content.",
    expectedImpact: "Momentum is compounding — protecting it is higher value than new acquisition spend.",
    metrics: [{ label: "Sessions", value: "4,402", delta: "+38%" }],
    analyticsHref: "/admin/analytics",
    createdAt: "2026-08-22T19:05:00Z",
  },
  {
    id: "ins_004",
    title: "Sudden traffic drop on project pages",
    description: "Project detail pages lost roughly a third of sessions within 48 hours.",
    type: "anomaly",
    severity: "critical",
    confidence: 74,
    source: ["Web Analytics", "Site Behaviour"],
    agent: "cro",
    reasoning:
      "The drop is isolated to one template and coincides with a spike in time-to-first-byte, which usually points at a rendering or indexing regression rather than seasonality.",
    whatHappened: "Project page sessions fell 32% in 48 hours while other templates held flat.",
    whyItMatters: "Project pages carry the strongest portfolio proof and feed the consultation funnel.",
    expectedImpact: "Left unresolved, this compounds into lost enquiries within two weeks.",
    metrics: [
      { label: "Sessions", value: "-32%" },
      { label: "TTFB", value: "1.9s", delta: "+0.8s" },
    ],
    analyticsHref: "/admin/analytics",
    createdAt: "2026-08-22T11:40:00Z",
  },
  {
    id: "ins_005",
    title: "Create supporting content for Oak & Linen",
    description: "A high-performing collection has no editorial support in the journal.",
    type: "recommendation",
    severity: "medium",
    confidence: 79,
    source: ["Collection Data", "Web Analytics"],
    agent: "content",
    reasoning:
      "Oak & Linen ranks in the top three collections by engagement but has zero inbound internal links from editorial content.",
    whatHappened: "Top-three engagement, zero editorial coverage.",
    whyItMatters: "Editorial support builds internal link equity and gives sales a narrative asset.",
    expectedImpact: "Qualitative: stronger internal linking, improved topical depth.",
    analyticsHref: "/admin/analytics",
    recommendationId: "rec_003",
    createdAt: "2026-08-22T09:15:00Z",
  },
  {
    id: "ins_006",
    title: "Three high-intent leads detected this week",
    description: "Repeat visits, catalogue downloads and wishlist activity from the same identities.",
    type: "lead_intelligence",
    severity: "high",
    confidence: 83,
    source: ["Lead Data", "Site Behaviour"],
    agent: "leads",
    reasoning:
      "Behavioural scoring flags identities with three or more sessions, a catalogue download and at least two wishlist adds within seven days.",
    whatHappened: "Three identities crossed the high-intent threshold.",
    whyItMatters: "Response speed on high-intent enquiries is the single strongest conversion lever.",
    expectedImpact: "Prioritised follow-up typically lifts consultation booking rate materially.",
    analyticsHref: "/admin/analytics",
    createdAt: "2026-08-21T16:02:00Z",
  },
  {
    id: "ins_007",
    title: "6 reviews from the last 30 days have no response",
    description: "Local listing reviews are trending positive, but the lowest-rated ones are going unanswered.",
    type: "warning",
    severity: "medium",
    confidence: 90,
    source: ["Web Analytics"],
    agent: "seo",
    reasoning:
      "Of 212 reviews in the last 30 days, six sit at 1–2★ with no owner reply. Response rate on low ratings is a known local-pack ranking signal.",
    whatHappened: "6 of 212 recent reviews (1–2★) have no reply after 30 days.",
    whyItMatters: "Unanswered negative reviews are disproportionately visible and can slow local pack momentum.",
    expectedImpact: "Responding typically limits further rating slide and can lift the response-rate signal used in local ranking.",
    metrics: [
      { label: "Unanswered", value: "6" },
      { label: "Local pack rank", value: "#3", delta: "from #4" },
    ],
    analyticsHref: "/admin/ai-marketing/seo",
    recommendationId: "rec_007",
    createdAt: "2026-08-23T07:38:00Z",
  },
];

export const recommendations: AIRecommendation[] = [
  {
    id: "rec_001",
    insightId: "ins_001",
    title: "Improve SEO metadata for Serenade Orange",
    description:
      "Rewrite the collection title, meta description and H1 to target the demand pattern already visible in analytics, then commission one supporting editorial piece.",
    actionType: "Metadata update",
    risk: "low",
    status: "pending",
    expectedImpact: "+8–14% organic sessions to the collection over one quarter",
    confidence: 87,
    agent: "seo",
    createdAt: "2026-08-23T08:26:00Z",
    priority: "medium",
    why: "Demand exists (41% engagement growth) but organic visibility hasn't followed — a metadata rewrite is the lowest-risk lever to close that gap.",
    suggestedAction: "AI drafts a new title, meta description and H1 for your review.",
  },
  {
    id: "rec_002",
    insightId: "ins_002",
    title: "Simplify consultation step two",
    description:
      "Reduce required fields from nine to five and defer project-budget capture to the confirmation email.",
    actionType: "Funnel change",
    risk: "medium",
    status: "pending",
    expectedImpact: "Recover an estimated 9–12 enquiries per month",
    confidence: 81,
    agent: "cro",
    createdAt: "2026-08-23T08:31:00Z",
    priority: "high",
    why: "A third of qualified interest is lost after step two — cutting the form down removes the most common exit point.",
    suggestedAction: "AI proposes the trimmed field set and defers budget capture to a follow-up email.",
    change: { from: "9 fields", to: "5 fields" },
  },
  {
    id: "rec_003",
    insightId: "ins_005",
    title: "Commission Oak & Linen editorial feature",
    description: "Produce a 1,200-word styling feature and link it from the collection and journal index.",
    actionType: "Content brief",
    risk: "low",
    status: "pending",
    expectedImpact: "Improved topical depth and internal link equity",
    confidence: 79,
    agent: "content",
    createdAt: "2026-08-22T09:20:00Z",
    priority: "low",
    why: "Oak & Linen ranks top-three by engagement with zero editorial coverage — a feature compounds existing interest instead of buying new traffic.",
    suggestedAction: "AI drafts a 1,200-word feature brief for the content team.",
  },
  {
    id: "rec_004",
    insightId: "ins_006",
    title: "Prioritise three high-intent leads for same-day follow-up",
    description: "Route the flagged identities to the senior consultation queue with context attached.",
    actionType: "Lead routing",
    risk: "low",
    status: "approved",
    expectedImpact: "Faster response on the highest-probability enquiries",
    confidence: 83,
    agent: "leads",
    createdAt: "2026-08-21T16:10:00Z",
    priority: "medium",
    why: "Behavioural scoring flagged three identities as high-intent — response speed is the strongest lever available on enquiries this warm.",
    suggestedAction: "Route to the senior consultation queue with full context attached.",
  },
  {
    id: "rec_005",
    insightId: "ins_004",
    title: "Investigate project template regression",
    description: "Open an engineering ticket for the TTFB regression on the project detail template.",
    actionType: "Technical ticket",
    risk: "low",
    status: "executed",
    expectedImpact: "Restore lost sessions on the portfolio surface",
    confidence: 74,
    agent: "cro",
    createdAt: "2026-08-22T12:02:00Z",
    priority: "high",
    why: "TTFB spiked in lockstep with the session drop on one template — a rendering regression, not seasonality.",
    suggestedAction: "Engineering ticket opened; sessions are being monitored for recovery.",
  },
  {
    id: "rec_006",
    insightId: "ins_003",
    title: "Expand catalogue landing structure",
    description: "Split the catalogue index into material-led sub-indexes to capture the mobile trend.",
    actionType: "Information architecture",
    risk: "high",
    status: "rejected",
    expectedImpact: "Deeper crawlable surface for catalogue demand",
    confidence: 68,
    agent: "seo",
    createdAt: "2026-08-20T10:44:00Z",
    priority: "low",
    why: "Splitting the catalogue index would deepen the crawlable surface, but the change touches every catalogue URL — a wide blast radius for the traffic gain on offer.",
    suggestedAction: "Revisit with a smaller pilot on one material category before a full split.",
  },
  {
    id: "rec_007",
    insightId: "ins_007",
    title: "Respond to 6 unanswered reviews",
    description:
      "Draft and send personalised replies to the six 1–2★ reviews from the last 30 days that have no owner response yet.",
    actionType: "Review response",
    risk: "low",
    status: "pending",
    expectedImpact: "Protect local pack rank (#3) and improve response-rate signal",
    confidence: 90,
    agent: "seo",
    createdAt: "2026-08-23T07:40:00Z",
    priority: "medium",
    why: "Unanswered negative reviews correlate with lower local pack visibility, and these are the only ones without a reply.",
    suggestedAction: "AI drafts a personalised reply for each review, ready for your approval.",
  },
];

export const approvals: AIApproval[] = recommendations.map((r) => ({
  id: `apr_${r.id.slice(4)}`,
  recommendationId: r.id,
  title: r.title,
  summary: r.description,
  agent: r.agent,
  risk: r.risk,
  status: r.status,
  requestedAt: r.createdAt,
  ...(r.status !== "pending" ? { decidedBy: "A. Whitfield", decidedAt: r.createdAt } : {}),
}));

export const activity: AIActivity[] = [
  {
    id: "act_1",
    time: "08:20",
    actor: "SEO Agent",
    agent: "seo",
    kind: "analysis",
    message: "Analysed 42 pages across collections and catalogue.",
  },
  {
    id: "act_2",
    time: "08:22",
    actor: "SEO Agent",
    agent: "seo",
    kind: "insight",
    message: "Detected 7 organic opportunities.",
  },
  {
    id: "act_3",
    time: "08:24",
    actor: "CRO Agent",
    agent: "cro",
    kind: "insight",
    message: "Flagged consultation funnel drop-off after step two.",
  },
  {
    id: "act_4",
    time: "08:26",
    actor: "AI Orchestrator",
    kind: "recommendation",
    message: "Generated 3 recommendations for review.",
  },
  {
    id: "act_5",
    time: "08:30",
    actor: "A. Whitfield",
    kind: "approval",
    message: "Approved lead routing recommendation.",
  },
  {
    id: "act_6",
    time: "08:31",
    actor: "AI Orchestrator",
    kind: "execution",
    message: "Executed lead routing action — 3 leads prioritised.",
  },
  {
    id: "act_7",
    time: "08:44",
    actor: "Marketing System",
    kind: "system",
    message: "Completed daily analysis cycle.",
  },
  {
    id: "act_8",
    time: "09:02",
    actor: "Lead Intelligence",
    agent: "leads",
    kind: "insight",
    message: "Detected 3 high-intent leads.",
  },
];

export const kpis: AIKpi[] = [
  {
    id: "opportunities",
    label: "AI Opportunities",
    value: 27,
    deltaLabel: "+18% vs last period",
    deltaDirection: "up",
    footnote: "Derived from Web Analytics",
    spark: [8, 11, 9, 14, 16, 19, 22, 27],
    live: true,
  },
  {
    id: "insights",
    label: "AI Insights",
    value: 14,
    deltaLabel: "+5 this week",
    deltaDirection: "up",
    footnote: "Monitoring",
    spark: [4, 5, 7, 6, 9, 11, 12, 14],
    live: true,
  },
  {
    id: "approvals",
    label: "Pending Approvals",
    value: 3,
    deltaLabel: "2 high priority",
    deltaDirection: "flat",
    footnote: "Requires review",
    spark: [1, 2, 2, 3, 2, 4, 3, 3],
  },
  {
    id: "agents",
    label: "Active Agents",
    value: 0,
    suffix: "/5",
    deltaLabel: "Awaiting backend",
    deltaDirection: "flat",
    footnote: "Claude orchestration not connected",
    spark: [0, 0, 0, 0, 0, 0, 0, 0],
  },
];

function buildSeries(days: number): TimeseriesPoint[] {
  const out: TimeseriesPoint[] = [];
  let traffic = 780;
  let leads = 14;
  let engagement = 41;
  let conversions = 6;
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(2026, 7, 23) - i * 86400000);
    const wave = Math.sin(i / 4) * 0.06;
    traffic = Math.round(traffic * (1.006 + wave * 0.5));
    leads = Math.max(4, Math.round(leads * (1.004 + wave)));
    engagement = Math.min(96, Math.round(engagement * (1.003 + wave * 0.4)));
    conversions = Math.max(2, Math.round(conversions * (1.005 + wave * 0.8)));
    out.push({
      date: d.toISOString().slice(0, 10),
      traffic,
      leads,
      engagement,
      conversions,
    });
  }
  return out;
}

export const seriesByRange: Record<string, TimeseriesPoint[]> = {
  "7D": buildSeries(7),
  "30D": buildSeries(30),
  "90D": buildSeries(90),
  "12M": buildSeries(120),
};

export const seoOpportunities: SeoOpportunity[] = [
  {
    id: "seo_1",
    title: "Improve Serenade metadata",
    impact: "High",
    confidence: 89,
    source: "GSC + Analytics",
    status: "Review",
    detail:
      "The collection ranks on the second page for three commercial phrases while engagement sits in the top decile. Metadata rewrite is the lowest-risk lever.",
  },
  {
    id: "seo_2",
    title: "Create living room styling article",
    impact: "High",
    confidence: 84,
    source: "Analytics + SEO",
    status: "Review",
    detail:
      "Demand for room-level inspiration is visible in on-site search with no matching editorial destination.",
  },
  {
    id: "seo_3",
    title: "Add FAQ schema to consultation page",
    impact: "Medium",
    confidence: 78,
    source: "SEO",
    status: "Review",
    detail: "Structured data would make the consultation page eligible for richer search presentation.",
  },
  {
    id: "seo_4",
    title: "Consolidate duplicate catalogue paths",
    impact: "Medium",
    confidence: 72,
    source: "Site crawl",
    status: "Review",
    detail: "Two catalogue paths resolve to near-identical content, splitting internal link equity.",
  },
  {
    id: "seo_5",
    title: "Internal links from journal to collections",
    impact: "Low",
    confidence: 66,
    source: "Content graph",
    status: "Review",
    detail: "Eleven journal entries mention collections without linking to them.",
  },
];

export const contentQueue: ContentQueueItem[] = [
  {
    id: "cq_1",
    platform: "Instagram",
    title: "5 ways to style a modern living room",
    status: "Scheduled",
    scheduledFor: "Today · 17:30",
    aiAssisted: true,
    engagement: [{ label: "Reach", value: "—" }],
  },
  {
    id: "cq_2",
    platform: "Blog",
    title: "Serenade: the case for warm minimalism",
    status: "Draft",
    scheduledFor: "Fri · 09:00",
    aiAssisted: true,
  },
  {
    id: "cq_3",
    platform: "Facebook",
    title: "Client story — Kensington townhouse",
    status: "Needs Review",
    scheduledFor: "Tomorrow · 11:00",
    aiAssisted: false,
  },
  {
    id: "cq_4",
    platform: "YouTube",
    title: "Oak & Linen — full collection walkthrough",
    status: "Draft",
    scheduledFor: "Unscheduled",
    aiAssisted: true,
  },
  {
    id: "cq_5",
    platform: "TikTok",
    title: "Before & after: a 1930s dining room",
    status: "Scheduled",
    scheduledFor: "Sat · 18:00",
    aiAssisted: true,
  },
  {
    id: "cq_6",
    platform: "Website",
    title: "Consultation page — revised hero copy",
    status: "Needs Review",
    scheduledFor: "Pending approval",
    aiAssisted: true,
  },
];

/* ------------------------------------------------------------------ */
/* Overview — Business Health & Today's Priorities                     */
/* ------------------------------------------------------------------ */

export const businessHealth: BusinessHealth = {
  score: 85,
  status: "Healthy",
  deltaLabel: "+4 pts vs last week",
  deltaDirection: "up",
  summary: "Overall performance is healthy. The consultation funnel and recent reviews need attention this week.",
  areasNeedingAttention: 2,
};

export const priorities: PriorityItem[] = [
  {
    id: "pri_1",
    priority: "high",
    title: "Consultation funnel drop-off after step two",
    explanation: "Completion fell from 71% to 38% — AI recommends simplifying the form.",
    agent: "cro",
    expectedImpact: "Recover 9–12 enquiries/month",
    href: "/admin/ai-marketing/ai-center/recommendations",
    recommendationId: "rec_002",
  },
  {
    id: "pri_2",
    priority: "medium",
    title: "6 reviews need a response",
    explanation: "1–2★ reviews from the last 30 days have no reply yet.",
    agent: "seo",
    expectedImpact: "Protect local pack rank (#3)",
    href: "/admin/ai-marketing/ai-center/recommendations",
    recommendationId: "rec_007",
  },
  {
    id: "pri_3",
    priority: "medium",
    title: "Serenade demand isn't converting to search visibility",
    explanation: "Engagement is up 41% while organic presence stays flat.",
    agent: "seo",
    expectedImpact: "+8–14% organic sessions this quarter",
    href: "/admin/ai-marketing/ai-center/recommendations",
    recommendationId: "rec_001",
  },
  {
    id: "pri_4",
    priority: "low",
    title: "Oak & Linen has no editorial coverage",
    explanation: "Top-three collection by engagement, zero supporting content.",
    agent: "content",
    expectedImpact: "Stronger internal linking",
    href: "/admin/ai-marketing/ai-center/recommendations",
    recommendationId: "rec_003",
  },
];

export const overviewKpis: AIKpi[] = [
  {
    id: "revenue_impact",
    label: "Revenue Impact",
    value: 18.4,
    suffix: "K",
    decimals: 1,
    deltaLabel: "+12.5% vs last week",
    deltaDirection: "up",
    footnote: "Modelled from approved AI actions",
    spark: [9, 10.4, 11, 12.8, 14.1, 15.6, 16.9, 18.4],
  },
  {
    id: "active_campaigns",
    label: "Active Campaigns",
    value: 3,
    deltaLabel: "1 launched this week",
    deltaDirection: "up",
    footnote: "Across SEO, CRO & Content",
    spark: [1, 1, 2, 2, 2, 3, 3, 3],
  },
  {
    id: "ai_recommendations",
    label: "AI Recommendations",
    value: 7,
    deltaLabel: "+1 this week",
    deltaDirection: "up",
    footnote: "3 awaiting your review",
    spark: [3, 4, 4, 5, 5, 6, 6, 7],
  },
  {
    id: "tasks_automated",
    label: "Tasks Automated",
    value: 34,
    deltaLabel: "+9 this week",
    deltaDirection: "up",
    footnote: "Analyses, drafts & routed leads",
    spark: [12, 15, 18, 21, 24, 27, 30, 34],
  },
];

export const channelPerformance: ChannelPerformanceItem[] = [
  { channel: "Organic Search", value: 12600, share: 38, tone: "ai" },
  { channel: "Direct", value: 6800, share: 21, tone: "insight" },
  { channel: "Referral", value: 5200, share: 16, tone: "success" },
  { channel: "Social", value: 4900, share: 15, tone: "warning" },
  { channel: "Email", value: 3100, share: 10, tone: "info" },
];

export const agentById = (id: string) => agents.find((a) => a.id === id);
export const insightById = (id: string) => insights.find((i) => i.id === id);
export const recommendationById = (id: string) => recommendations.find((r) => r.id === id);
