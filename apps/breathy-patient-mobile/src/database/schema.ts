import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'appointments',
      columns: [
        { name: 'doctor_id', type: 'string', isOptional: true },
        { name: 'patient_id', type: 'string', isOptional: true },
        { name: 'start_time', type: 'number' },
        { name: 'end_time', type: 'number', isOptional: true },
        { name: 'status', type: 'string', isOptional: true },
        { name: 'appointment_type', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number', isOptional: true },
      ]
    }),
    tableSchema({
      name: 'chats',
      columns: [
        { name: 'appointment_id', type: 'string', isOptional: true },
        { name: 'sender_id', type: 'string', isOptional: true },
        { name: 'receiver_id', type: 'string', isOptional: true },
        { name: 'message_content', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
      ]
    })
  ]
});
