import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { setGenerator } from '@nozbe/watermelondb/utils/common/randomId';
import uuid from 'react-native-uuid';
import { mySchema } from './schema';
import Patient from './models/Patient';
import Appointment from './models/Appointment';
import { Logger } from '../utils/logger';
setGenerator(() => uuid.v4() as string);
// 1. Create the SQLite Adapter
const adapter = new SQLiteAdapter({
  schema: mySchema,
  // (You might want to add migrations here later)
  jsi: true, // Enables maximum performance mode
  onSetUpError: error => {
    // Database failed to load
    Logger.error("WatermelonDB failed to initialize:", error, { source: 'database/index' });
  }
});

// 2. Instantiate the Database
export const database = new Database({
  adapter,
  modelClasses: [
    Patient,
    Appointment,
  ],
});