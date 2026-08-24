/**
 * DEMO / PREVIEW FIXTURES for Workspace › Campaigns and Workspace › Impact.
 * Deliberately wired to the same recommendation IDs used across Overview
 * and AI Center, so the story stays connected instead of feeling like
 * disconnected placeholder data. Replace with Laravel API calls later —
 * see lib/ai/services.
 */
import type { Campaign, ImpactRecord } from "./types";

export const campaigns: Campaign[] = [
  {
    id: "camp_serenade",
    name: "Serenade Collection Push",
    channel: "SEO · Organic",
    health: "Good",
    status: "Active",
    summary: "Turning existing demand for Serenade into organic sessions instead of buying new traffic for it.",
    goals: [
      { label: "Organic sessions", target: "+8–14%", current: "+3%", onTrack: true },
      { label: "Avg. dwell time", target: "2m 15s", current: "2m 04s", onTrack: true },
    ],
    plan: [
      { id: "step_1", label: "Analyse collection engagement vs. search visibility", state: "done" },
      { id: "step_2", label: "Identify the visibility gap", state: "done", recommendationId: "rec_001" },
      { id: "step_3", label: "Rewrite metadata & commission editorial piece", state: "active", recommendationId: "rec_001" },
      { id: "step_4", label: "Publish supporting content", state: "upcoming", recommendationId: "rec_003" },
      { id: "step_5", label: "Monitor for 30 days", state: "upcoming" },
    ],
    activeExperiments: [
      {
        id: "exp_1",
        name: "Metadata rewrite A/B",
        hypothesis: "A demand-matched title & meta description improves click-through from search.",
        status: "Queued",
      },
    ],
    relatedRecommendationIds: ["rec_001", "rec_003"],
    spark: [3180, 3340, 3510, 3600, 3720, 3810, 3890, 3960],
    metric: { label: "Organic sessions (30d)", value: "3,960", deltaLabel: "+3% since launch", deltaDirection: "up" },
  },
  {
    id: "camp_funnel",
    name: "Consultation Funnel Recovery",
    channel: "CRO · Site",
    health: "Needs Attention",
    status: "Active",
    summary: "Step-two completion dropped from 71% to 38%. Simplifying the form is the first lever.",
    goals: [
      { label: "Step 1 → 2 completion", target: "65%+", current: "38%", onTrack: false },
      { label: "Monthly enquiries", target: "+9–12", current: "+0", onTrack: false },
    ],
    plan: [
      { id: "step_1", label: "Diagnose the drop-off point", state: "done", recommendationId: "rec_002" },
      { id: "step_2", label: "Identify the weakest step", state: "done", recommendationId: "rec_002" },
      { id: "step_3", label: "Simplify step two — 9 fields → 5", state: "active", recommendationId: "rec_002" },
      { id: "step_4", label: "Test the shortened form against the original", state: "upcoming" },
      { id: "step_5", label: "Monitor completion for 14 days", state: "upcoming" },
    ],
    activeExperiments: [
      {
        id: "exp_2",
        name: "Short form vs. long form",
        hypothesis: "Reducing required fields from nine to five lifts step-two completion by 20pt+.",
        status: "Queued",
      },
    ],
    relatedRecommendationIds: ["rec_002"],
    spark: [71, 64, 58, 49, 44, 40, 38, 38],
    metric: { label: "Step 1 → 2 completion", value: "38%", deltaLabel: "-33pt vs baseline", deltaDirection: "down" },
  },
  {
    id: "camp_oak_linen",
    name: "Oak & Linen Editorial",
    channel: "Content · Organic",
    health: "Fair",
    status: "Active",
    summary: "A top-three collection by engagement has no editorial support in the journal — closing that gap.",
    goals: [{ label: "Internal links from journal", target: "3+", current: "0", onTrack: false }],
    plan: [
      { id: "step_1", label: "Confirm engagement vs. editorial coverage gap", state: "done", recommendationId: "rec_003" },
      { id: "step_2", label: "Brief a 1,200-word feature", state: "active", recommendationId: "rec_003" },
      { id: "step_3", label: "Publish & link from collection + journal index", state: "upcoming" },
    ],
    activeExperiments: [],
    relatedRecommendationIds: ["rec_003"],
    spark: [0, 0, 0, 0, 0, 1, 1, 1],
    metric: { label: "Editorial pieces live", value: "0", deltaLabel: "1 in progress", deltaDirection: "flat" },
  },
];

export const impactRecords: ImpactRecord[] = [
  {
    id: "imp_1",
    recommendationId: "rec_005",
    title: "Investigate project template regression",
    agent: "cro",
    approvedAt: "2026-08-22T12:02:00Z",
    metricLabel: "Project page sessions",
    before: "-32% (48h drop)",
    after: { 7: "-6%", 14: "+2%" },
    changePct: { 7: 26, 14: 34 },
    result: "positive",
    aiConclusion: "The TTFB fix reversed the session drop within two weeks — recommendation produced a positive result.",
  },
  {
    id: "imp_2",
    recommendationId: "rec_004",
    title: "Prioritise 3 high-intent leads for same-day follow-up",
    agent: "leads",
    approvedAt: "2026-08-21T16:10:00Z",
    metricLabel: "Avg. response time",
    before: "42 min (account avg.)",
    after: { 7: "9s" },
    changePct: { 7: 99 },
    result: "positive",
    aiConclusion: "All three flagged leads received a response within a minute; one has already booked a consultation.",
  },
];

export const campaignById = (id: string) => campaigns.find((c) => c.id === id);
