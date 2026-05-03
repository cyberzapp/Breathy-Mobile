import { Q } from '@nozbe/watermelondb';
import { database } from '../database';
import DietPlanModel from '../database/models/DietPlan';
import apiClient from '../lib/apiClient';
import { isOnline } from './offlineCacheService';
import { Logger } from '../utils/logger';

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
  server_id?: string;
  doctor_id?: string;
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
  sync_status?: 'synced' | 'pending' | 'conflict';
  created_at?: string;
  updated_at?: string;
}

const collection = () => database.get<DietPlanModel>('diet_plans');

function modelToData(m: DietPlanModel): DietPlan {
  return {
    id: m.id,
    server_id: m.serverId || undefined,
    plan_name: m.planName,
    meals: m.meals,
    dietary_restrictions: m.dietaryRestrictions,
    goals: m.goals || '',
    notes: m.notes || '',
    status: m.status as DietPlan['status'],
    is_template: m.isTemplate,
    is_archived: m.isArchived,
    is_pinned: m.isPinned,
    labels: m.labels,
    sync_status: m.localSyncStatus as DietPlan['sync_status'],
    patient_id: m.patientId || null,
    created_at: m.createdAt?.toISOString(),
    updated_at: m.updatedAt?.toISOString(),
  };
}

export const dietPlanService = {
  /**
   * Get active (non-archived) diet plans — offline-first
   */
  getDietPlans: async (): Promise<DietPlan[]> => {
    try {
      // 1. Read from local DB
      const local = await collection().query(
        Q.where('is_archived', false)
      ).fetch();

      // 2. Background sync if online
      if (await isOnline()) {
        try {
          const response = await apiClient.get('/api/diet-plans');
          const serverPlans = response.data || [];
          await syncServerToLocal(serverPlans);
          // Re-read after sync
          const refreshed = await collection().query(Q.where('is_archived', false)).fetch();
          return refreshed.map(modelToData);
        } catch {
          // API failed, use local data
        }
      }

      return local.map(modelToData);
    } catch (error) {
      Logger.error('getDietPlans failed', error, { source: 'dietPlanService' });
      return [];
    }
  },

  /**
   * Get archived diet plans
   */
  getArchivedDietPlans: async (): Promise<DietPlan[]> => {
    try {
      const local = await collection().query(
        Q.where('is_archived', true)
      ).fetch();

      if (await isOnline()) {
        try {
          const response = await apiClient.get('/api/diet-plans/archived');
          const serverPlans = response.data || [];
          await syncServerToLocal(serverPlans);
          const refreshed = await collection().query(Q.where('is_archived', true)).fetch();
          return refreshed.map(modelToData);
        } catch { /* use local */ }
      }

      return local.map(modelToData);
    } catch (error) {
      Logger.error('getArchivedDietPlans failed', error, { source: 'dietPlanService' });
      return [];
    }
  },

  /**
   * Create diet plan — writes locally first, then syncs to server
   */
  createDietPlan: async (data: Partial<DietPlan>): Promise<DietPlan> => {
    const created = await database.write(async () => {
      return await collection().create((record: any) => {
        record.planName = data.plan_name || 'Untitled Plan';
        record.mealsJson = JSON.stringify(data.meals || []);
        record.goals = data.goals || '';
        record.notes = data.notes || '';
        record.dietaryRestrictionsJson = JSON.stringify(data.dietary_restrictions || []);
        record.labelsJson = JSON.stringify(data.labels || []);
        record.isTemplate = data.is_template ?? true;
        record.isArchived = data.is_archived ?? false;
        record.isPinned = data.is_pinned ?? false;
        record.status = data.status || 'active';
        record.patientId = data.patient_id || undefined;
        record._syncStatus = 'pending';
      });
    });

    // Try to sync to server in background
    if (await isOnline()) {
      try {
        const response = await apiClient.post('/api/diet-plans', data);
        const serverId = response.data?.id;
        if (serverId) await created.markSynced(serverId);
      } catch (error) {
        Logger.warn('Create sync failed, will retry later', { source: 'dietPlanService' });
      }
    }

    return modelToData(created);
  },

  /**
   * Update diet plan
   */
  updateDietPlan: async (planId: string, data: Partial<DietPlan>): Promise<DietPlan> => {
    const record = await collection().find(planId);
    await database.write(async () => {
      await record.update((r: any) => {
        if (data.plan_name !== undefined) r.planName = data.plan_name;
        if (data.meals !== undefined) r.mealsJson = JSON.stringify(data.meals);
        if (data.goals !== undefined) r.goals = data.goals;
        if (data.notes !== undefined) r.notes = data.notes;
        if (data.dietary_restrictions !== undefined) r.dietaryRestrictionsJson = JSON.stringify(data.dietary_restrictions);
        if (data.labels !== undefined) r.labelsJson = JSON.stringify(data.labels);
        if (data.is_template !== undefined) r.isTemplate = data.is_template;
        if (data.is_archived !== undefined) r.isArchived = data.is_archived;
        if (data.is_pinned !== undefined) r.isPinned = data.is_pinned;
        if (data.status !== undefined) r.status = data.status;
        if (data.patient_id !== undefined) r.patientId = data.patient_id || undefined;
        r._syncStatus = 'pending';
      });
    });

    // Background sync
    if (await isOnline() && record.serverId) {
      try {
        await apiClient.put(`/api/diet-plans/${record.serverId}`, data);
        await record.markSynced(record.serverId);
      } catch {
        Logger.warn('Update sync failed', { source: 'dietPlanService' });
      }
    }

    return modelToData(record);
  },

  /**
   * Duplicate a diet plan
   */
  duplicateDietPlan: async (planId: string): Promise<DietPlan> => {
    const source = await collection().find(planId);
    const created = await database.write(async () => {
      return await collection().create((record: any) => {
        record.planName = `${source.planName} (Copy)`;
        record.mealsJson = source.mealsJson;
        record.goals = source.goals;
        record.notes = source.notes;
        record.dietaryRestrictionsJson = source.dietaryRestrictionsJson;
        record.labelsJson = source.labelsJson;
        record.isTemplate = source.isTemplate;
        record.isArchived = false;
        record.isPinned = false;
        record.status = 'active';
        record._syncStatus = 'pending';
      });
    });

    // Sync duplicate to server
    if (await isOnline() && source.serverId) {
      try {
        const response = await apiClient.post(`/api/diet-plans/${source.serverId}/duplicate`);
        const serverId = response.data?.id;
        if (serverId) await created.markSynced(serverId);
      } catch {
        Logger.warn('Duplicate sync failed', { source: 'dietPlanService' });
      }
    }

    return modelToData(created);
  },

  /**
   * Delete diet plan — remove locally, sync deletion to server
   */
  deleteDietPlan: async (planId: string): Promise<void> => {
    const record = await collection().find(planId);
    const serverId = record.serverId;

    await database.write(async () => {
      await record.markAsDeleted();
    });

    if (await isOnline() && serverId) {
      try {
        await apiClient.delete(`/api/diet-plans/${serverId}`);
      } catch {
        Logger.warn('Delete sync failed', { source: 'dietPlanService' });
      }
    }
  },

  /**
   * Push all pending changes to server
   */
  syncPendingChanges: async (): Promise<number> => {
    if (!(await isOnline())) return 0;

    try {
      const pending = await collection().query(
        Q.where('sync_status', 'pending')
      ).fetch();

      let synced = 0;
      for (const plan of pending) {
        try {
          const data = {
            plan_name: plan.planName,
            meals: plan.meals,
            goals: plan.goals || '',
            notes: plan.notes || '',
            dietary_restrictions: plan.dietaryRestrictions,
            labels: plan.labels,
            is_template: plan.isTemplate,
            is_archived: plan.isArchived,
            is_pinned: plan.isPinned,
            status: plan.status,
            patient_id: plan.patientId || null,
          };

          if (plan.serverId) {
            await apiClient.put(`/api/diet-plans/${plan.serverId}`, data);
            await plan.markSynced(plan.serverId);
          } else {
            const response = await apiClient.post('/api/diet-plans', data);
            const serverId = response.data?.id;
            if (serverId) await plan.markSynced(serverId);
          }
          synced++;
        } catch (error) {
          Logger.warn(`Failed to sync plan ${plan.id}`, { source: 'dietPlanService' });
        }
      }
      return synced;
    } catch (error) {
      Logger.error('syncPendingChanges failed', error, { source: 'dietPlanService' });
      return 0;
    }
  },

  /**
   * Get count of pending (unsynced) plans
   */
  getPendingCount: async (): Promise<number> => {
    try {
      return await collection().query(Q.where('sync_status', 'pending')).fetchCount();
    } catch { return 0; }
  },
};

/**
 * Sync server data to local WatermelonDB — merge strategy
 */
async function syncServerToLocal(serverPlans: any[]): Promise<void> {
  try {
    await database.write(async () => {
      for (const sp of serverPlans) {
        // Check if we already have this server record
        const existing = await collection().query(
          Q.where('server_id', sp.id)
        ).fetch();

        if (existing.length === 0) {
          // New from server — create locally
          await collection().create((r: any) => {
            r.serverId = sp.id;
            r.planName = sp.plan_name;
            r.mealsJson = JSON.stringify(sp.meals || []);
            r.goals = sp.goals || '';
            r.notes = sp.notes || '';
            r.dietaryRestrictionsJson = JSON.stringify(sp.dietary_restrictions || []);
            r.labelsJson = JSON.stringify(sp.labels || []);
            r.isTemplate = sp.is_template ?? true;
            r.isArchived = sp.is_archived ?? false;
            r.isPinned = sp.is_pinned ?? false;
            r.status = sp.status || 'active';
            r.patientId = sp.patient_id || undefined;
            r._syncStatus = 'synced';
          });
        } else if (existing[0].localSyncStatus === 'synced') {
          await existing[0].update((r: any) => {
            r.planName = sp.plan_name;
            r.mealsJson = JSON.stringify(sp.meals || []);
            r.goals = sp.goals || '';
            r.notes = sp.notes || '';
            r.dietaryRestrictionsJson = JSON.stringify(sp.dietary_restrictions || []);
            r.labelsJson = JSON.stringify(sp.labels || []);
            r.isTemplate = sp.is_template ?? true;
            r.isArchived = sp.is_archived ?? false;
            r.isPinned = sp.is_pinned ?? false;
            r.status = sp.status || 'active';
          });
        }
        // If sync_status === 'pending', don't overwrite local changes
      }
    });
  } catch (error) {
    Logger.error('syncServerToLocal failed', error, { source: 'dietPlanService' });
  }
}
