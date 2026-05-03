import { createTable, schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';

export default schemaMigrations({
  migrations: [
    {
      // v1 → v2: Add Diet Plans and Food Items tables
      toVersion: 2,
      steps: [
        createTable({
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
            { name: 'sync_status', type: 'string' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        createTable({
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
            { name: 'source', type: 'string' },
          ],
        }),
      ],
    },
  ],
});
