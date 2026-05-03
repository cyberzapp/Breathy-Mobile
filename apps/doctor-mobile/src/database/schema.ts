import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const mySchema = appSchema({
  version: 2,
  tables: [
    tableSchema({
      name: 'patients',
      columns: [
        { name: 'full_name', type: 'string' },
        { name: 'phone_no', type: 'string', isOptional: true },
        { name: 'email', type: 'string', isOptional: true },
        { name: 'profile_photo_url', type: 'string', isOptional: true },
        { name: 'gender', type: 'string', isOptional: true },
        { name: 'city', type: 'string', isOptional: true },
        // Crucial for Sync
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'appointments',
      columns: [
        { name: 'patient_id', type: 'string', isIndexed: true },
        { name: 'doctor_id', type: 'string', isIndexed: true },
        { name: 'start_time', type: 'number' }, // Stored as Unix timestamp
        { name: 'status', type: 'string' }, // 'scheduled', 'completed', etc.
        { name: 'appointment_type', type: 'string', isOptional: true },
        // Crucial for Sync
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'diet_plans',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'plan_name', type: 'string' },
        { name: 'meals_json', type: 'string' },
        { name: 'goals', type: 'string', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'dietary_restrictions_json', type: 'string', isOptional: true },
        { name: 'labels_json', type: 'string', isOptional: true },
        { name: 'is_template', type: 'boolean' },
        { name: 'is_archived', type: 'boolean' },
        { name: 'is_pinned', type: 'boolean' },
        { name: 'status', type: 'string' },
        { name: 'patient_id', type: 'string', isOptional: true },
        { name: 'sync_status', type: 'string' },       // 'synced' | 'pending' | 'conflict'
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'food_items',
      columns: [
        { name: 'name', type: 'string', isIndexed: true },
        { name: 'name_hindi', type: 'string', isOptional: true },
        { name: 'category', type: 'string', isIndexed: true },
        { name: 'calories', type: 'number' },
        { name: 'protein', type: 'number' },
        { name: 'carbs', type: 'number' },
        { name: 'fat', type: 'number' },
        { name: 'fiber', type: 'number', isOptional: true },
        { name: 'serving_size', type: 'string' },
        { name: 'source', type: 'string' },             // 'ifct' | 'custom' | 'api'
      ]
    }),
  ]
});