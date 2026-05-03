import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export default class FoodItem extends Model {
  static table = 'food_items';

  @field('name') name!: string;
  @field('name_hindi') nameHindi?: string;
  @field('category') category!: string;
  @field('calories') calories!: number;
  @field('protein') protein!: number;
  @field('carbs') carbs!: number;
  @field('fat') fat!: number;
  @field('fiber') fiber?: number;
  @field('serving_size') servingSize!: string;
  @field('source') source!: string;
}
