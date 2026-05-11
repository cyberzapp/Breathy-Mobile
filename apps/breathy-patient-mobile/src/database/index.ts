import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';

// We will add Models here once created (e.g. Appointment, Chat)
const adapter = new SQLiteAdapter({
  schema,
  // (You might want to pass migrations here later)
  jsi: true, // Requires JSI SQLiteAdapter native setup
  onSetUpError: error => {
    console.error("WatermelonDB setup error", error);
  }
});

export const database = new Database({
  adapter,
  modelClasses: [
    // Appointment,
    // Chat,
  ],
});
