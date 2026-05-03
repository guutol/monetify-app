// Global TypeScript types for Monetify

export type Plan = "free" | "starter" | "pro";

export interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  plan: Plan;
  credits: number;
  createdAt: Date;
}

export interface GeneratedImage {
  id: string;
  userId: string;
  prompt: string;
  imageUrl: string;
  createdAt: Date;
}
