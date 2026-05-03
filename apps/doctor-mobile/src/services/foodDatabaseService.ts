import { Q } from '@nozbe/watermelondb';
import { database } from '../database';
import FoodItem from '../database/models/FoodItem';
import apiClient from '../lib/apiClient';
import { isOnline } from './offlineCacheService';
import { Logger } from '../utils/logger';

export interface FoodData {
  id: string;
  name: string;
  name_hindi?: string;
  category: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  serving_size: string;
  is_common?: boolean;
}

const foodCollection = () => database.get<FoodItem>('food_items');

/**
 * Search foods — offline-first: searches local WatermelonDB, falls back to API
 */
export async function searchFoods(query: string, category?: string): Promise<FoodData[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  try {
    // Try local DB first
    const nameFilter = Q.or(
      Q.where('name', Q.like(`%${Q.sanitizeLikeString(q)}%`)),
      Q.where('name_hindi', Q.like(`%${Q.sanitizeLikeString(q)}%`))
    );

    const conditions: any[] = [nameFilter];
    if (category) conditions.push(Q.where('category', category));

    const localResults = await foodCollection().query(
      Q.and(...conditions)
    ).fetch();

    if (localResults.length > 0) {
      return localResults.map(mapModelToData);
    }

    // Fallback to API if online and no local results
    if (await isOnline()) {
      const response = await apiClient.get('/api/food-database/search', {
        params: { q: query, ...(category && { category }) }
      });
      return response.data || [];
    }

    return [];
  } catch (error) {
    Logger.error('Food search failed', error, { source: 'foodDatabaseService' });
    return [];
  }
}

/**
 * Get common/frequently used foods
 */
export async function getCommonFoods(): Promise<FoodData[]> {
  try {
    // Try local first
    const local = await foodCollection().query(
      Q.where('source', Q.oneOf(['ifct', 'custom']))
    ).fetch();

    // Return a curated subset (first 30 items, sorted by category)
    if (local.length > 0) {
      return local.slice(0, 30).map(mapModelToData);
    }

    if (await isOnline()) {
      const response = await apiClient.get('/api/food-database/common');
      return response.data || [];
    }
    return [];
  } catch (error) {
    Logger.error('Get common foods failed', error, { source: 'foodDatabaseService' });
    return [];
  }
}

/**
 * Get all food categories
 */
export async function getCategories(): Promise<string[]> {
  try {
    const local = await foodCollection().query().fetch();
    if (local.length > 0) {
      const cats = [...new Set(local.map(f => f.category))].sort();
      return cats;
    }

    if (await isOnline()) {
      const response = await apiClient.get('/api/food-database/categories');
      return response.data || [];
    }
    return [];
  } catch (error) {
    Logger.error('Get categories failed', error, { source: 'foodDatabaseService' });
    return [];
  }
}

/**
 * Sync all foods from server to local WatermelonDB — called on first launch or manual sync
 */
export async function syncFoodsFromServer(): Promise<void> {
  try {
    if (!(await isOnline())) return;

    const localCount = await foodCollection().query().fetchCount();
    if (localCount > 100) return; // Already synced

    const response = await apiClient.get('/api/food-database/all');
    const serverFoods: FoodData[] = response.data || [];

    if (serverFoods.length === 0) return;

    await database.write(async () => {
      const batch = serverFoods.map(food =>
        foodCollection().prepareCreate((record: any) => {
          record.name = food.name;
          record.nameHindi = food.name_hindi || '';
          record.category = food.category;
          record.calories = food.calories;
          record.protein = food.protein;
          record.carbs = food.carbs;
          record.fat = food.fat;
          record.fiber = food.fiber || 0;
          record.servingSize = food.serving_size || '100g';
          record.source = 'ifct';
        })
      );
      await database.batch(...batch);
    });

    Logger.info(`Synced ${serverFoods.length} foods to local DB`, { source: 'foodDatabaseService' });
  } catch (error) {
    Logger.error('Food sync failed', error, { source: 'foodDatabaseService' });
  }
}

function mapModelToData(model: FoodItem): FoodData {
  return {
    id: model.id,
    name: model.name,
    name_hindi: model.nameHindi || undefined,
    category: model.category,
    calories: model.calories,
    protein: model.protein,
    carbs: model.carbs,
    fat: model.fat,
    fiber: model.fiber || undefined,
    serving_size: model.servingSize,
  };
}
