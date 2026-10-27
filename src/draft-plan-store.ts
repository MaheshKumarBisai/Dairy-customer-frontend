import type { Address, PlanFrequency, Product } from '@dairy/shared';

export interface DraftDairyPlanItem {
  product: Product;
  quantity: number;
}

export interface DraftDairyPlan {
  addressId: string;
  address?: Address;
  frequency: PlanFrequency;
  selectedDays: number[];
  startDate: string;
  items: DraftDairyPlanItem[];
}

let currentDraft: DraftDairyPlan | null = null;

export function getDraftPlan(): DraftDairyPlan | null {
  return currentDraft;
}

export function setDraftPlan(draft: DraftDairyPlan | null): void {
  currentDraft = draft;
}

export function clearDraftPlan(): void {
  currentDraft = null;
}
