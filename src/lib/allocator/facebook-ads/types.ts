
export interface FacebookAdAccount {
  id: string;
  name: string;
  account_id: string;
}

export interface FacebookCampaign {
  id: string;
  name:string;
  status: string;
  objective: string;
  daily_budget?: string;
  lifetime_budget?: string;
  budget_remaining?: string;
}

export interface FacebookAdSet {
  id: string;
  name: string;
  status: string;
  daily_budget?: string;
  lifetime_budget?: string;
  bid_strategy: string;
}

export interface FacebookAdCampaignResponse {
  data: FacebookCampaign[];
  paging?: {
    cursors: {
      before: string;
      after: string;
    };
    next?: string;
  };
}

export interface FacebookAdSetResponse {
  data: FacebookAdSet[];
  paging?: {
    cursors: {
      before: string;
      after: string;
    };
    next?: string;
  };
}

export interface FacebookInsights {
  spend: string;
  impressions: string;
  clicks: string;
}

export interface FacebookInsightsResponse {
  data: FacebookInsights[];
  paging?: {
    cursors: {
      before: string;
      after: string;
    };
    next?: string;
  };
}
