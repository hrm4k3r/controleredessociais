export type Client = { id: string; name: string; is_internal: boolean; weekly_goal: number; sort: number };
export type Account = { id: string; client_id: string; network: string };
export type Post = {
  id: string; post_date: string; client_id: string; status: string; format: string | null; theme: string | null;
  summary: string | null; link: string | null; notes: string | null;
};
export type PostNetwork = { post_id: string; network: string };
export type PostResult = {
  post_id: string; network: string; views: number | null; reach: number | null; likes: number | null;
  comments: number | null; shares: number | null; saves: number | null; clicks: number | null;
};
export type WeeklyMetric = {
  client_id: string; network: string; week_start: string; followers: number | null; views: number | null;
  reach: number | null; interactions: number | null; clicks: number | null; learning: string | null;
};
export type WeeklyNote = { client_id: string; week_start: string; comment: string | null; next_steps: string | null; public_token: string | null; collected_at?: string | null };

export type Dataset = {
  clients: Client[];
  accounts: Account[];
  posts: Post[];
  postNetworks: PostNetwork[];
  results: PostResult[];
  metrics: WeeklyMetric[];
};
