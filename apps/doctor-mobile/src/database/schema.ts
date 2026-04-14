import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const mySchema = appSchema({
  version: 1,
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
  ]
});