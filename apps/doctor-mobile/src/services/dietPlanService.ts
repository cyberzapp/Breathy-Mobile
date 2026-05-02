import apiClient from '../lib/apiClient';

export interface MealItem {
  name: string;
  quantity: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  notes: string;
}

export interface Meal {
  meal_type: string;
  time: string;
  items: MealItem[];
}

export interface DietPlan {
  id: string;
  doctor_id: string;
  patient_id?: string | null;
  plan_name: string;
  start_date?: string;
  end_date?: string;
  meals: Meal[];
  dietary_restrictions: string[];
  goals: string;
  notes: string;
  status: 'active' | 'completed' | 'paused';
  is_template: boolean;
  is_archived: boolean;
  is_pinned: boolean;
  labels: string[];
  created_at?: string;
  updated_at?: string;
}

export const dietPlanService = {
  getDietPlans: async () => {
    const response = await apiClient.get('/api/diet-plans');
    return response.data;
  },

  getArchivedDietPlans: async () => {
    const response = await apiClient.get('/api/diet-plans/archived');
    return response.data;
  },

  createDietPlan: async (data: Partial<DietPlan>) => {
    const response = await apiClient.post('/api/diet-plans', data);
    return response.data;
  },

  updateDietPlan: async (planId: string, data: Partial<DietPlan>) => {
    const response = await apiClient.put(`/api/diet-plans/${planId}`, data);
    return response.data;
  },

  duplicateDietPlan: async (planId: string) => {
    const response = await apiClient.post(`/api/diet-plans/${planId}/duplicate`);
    return response.data;
  },

  deleteDietPlan: async (planId: string) => {
    const response = await apiClient.delete(`/api/diet-plans/${planId}`);
    return response.data;
  }
};
