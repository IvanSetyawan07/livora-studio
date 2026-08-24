// Interfaces
export interface AIRecommendation {
  id: string;
  title: string;
  description: string;
  why: string;
  expectedImpact: string;
  confidence: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW' | 'CRITICAL';
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  agent: string;
  status: 'pending' | 'approved' | 'rejected' | 'running' | 'completed';
}

export interface BusinessHealth {
  score: number;
  status: 'Healthy' | 'Warning' | 'Critical';
  trend: number;
  summary: string;
}

export interface IAIMarketingService {
  getBusinessHealth(): Promise<BusinessHealth>;
  getTopPriorities(): Promise<AIRecommendation[]>;
  getRecommendations(): Promise<AIRecommendation[]>;
}

// Mock Implementation
export class MockAIMarketingService implements IAIMarketingService {
  async getBusinessHealth(): Promise<BusinessHealth> {
    return new Promise((resolve) => setTimeout(() => resolve({
      score: 85,
      status: 'Healthy',
      trend: 6,
      summary: "Overall performance is healthy. Paid acquisition and organic traffic require attention."
    }), 500));
  }

  async getTopPriorities(): Promise<AIRecommendation[]> {
    return new Promise((resolve) => setTimeout(() => resolve([
      {
        id: 'rec-1',
        title: "ROAS dropped 27% in Campaign A",
        description: "AI recommends budget optimization to improve performance.",
        why: "Cost per lead has spiked over the last 48 hours without corresponding conversion increases.",
        expectedImpact: "CPL ↓ 10–15%",
        confidence: 91,
        priority: 'HIGH',
        risk: 'LOW',
        agent: 'Ads Agent',
        status: 'pending'
      },
      {
        id: 'rec-2',
        title: "Organic traffic decreased 12%",
        description: "Technical SEO issues detected on key product pages.",
        why: "Recent site updates caused slow LCP times on mobile.",
        expectedImpact: "Traffic ↑ 8–10%",
        confidence: 84,
        priority: 'MEDIUM',
        risk: 'LOW',
        agent: 'SEO Agent',
        status: 'pending'
      },
      {
        id: 'rec-3',
        title: "15 reviews need response",
        description: "Quick responses can improve local reputation.",
        why: "2 negative reviews flagged as requiring immediate intervention.",
        expectedImpact: "Trust Score ↑",
        confidence: 78,
        priority: 'MEDIUM',
        risk: 'LOW',
        agent: 'Reputation Agent',
        status: 'pending'
      }
    ]), 500));
  }

  async getRecommendations(): Promise<AIRecommendation[]> {
    // Will return full list of recommendations later
    return this.getTopPriorities(); 
  }
}

// Singleton instance to be replaced by Laravel adapter later
export const aiMarketingService = new MockAIMarketingService();