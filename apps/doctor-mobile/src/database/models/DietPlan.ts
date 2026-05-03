import { Model } from '@nozbe/watermelondb';
import { field, date, writer } from '@nozbe/watermelondb/decorators';
import { Meal } from '../../services/dietPlanService';

export default class DietPlan extends Model {
  static table = 'diet_plans';

  @field('server_id') serverId?: string;
  @field('plan_name') planName!: string;
  @field('meals_json') mealsJson!: string;
  @field('goals') goals?: string;
  @field('notes') notes?: string;
  @field('dietary_restrictions_json') dietaryRestrictionsJson?: string;
  @field('labels_json') labelsJson?: string;
  @field('is_template') isTemplate!: boolean;
  @field('is_archived') isArchived!: boolean;
  @field('is_pinned') isPinned!: boolean;
  @field('status') status!: string;
  @field('patient_id') patientId?: string;
  @field('sync_status') _syncStatus!: string;

  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  get localSyncStatus(): string {
    return this._syncStatus || 'synced';
  }

  // JSON helpers
  get meals(): Meal[] {
    try { return JSON.parse(this.mealsJson || '[]'); }
    catch { return []; }
  }

  get dietaryRestrictions(): string[] {
    try { return JSON.parse(this.dietaryRestrictionsJson || '[]'); }
    catch { return []; }
  }

  get labels(): string[] {
    try { return JSON.parse(this.labelsJson || '[]'); }
    catch { return []; }
  }

  @writer async markSynced(serverId: string) {
    await this.update((plan: any) => {
      plan.serverId = serverId;
      plan._syncStatus = 'synced';
    });
  }

  @writer async markPending() {
    await this.update((plan: any) => {
      plan._syncStatus = 'pending';
    });
  }
}
