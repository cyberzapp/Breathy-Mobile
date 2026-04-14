import { Model } from '@nozbe/watermelondb';
import { field, date, relation } from '@nozbe/watermelondb/decorators';
import Patient from './Patient';

export default class Appointment extends Model {
  static table = 'appointments';

  // Associations: An appointment belongs to a patient
  static associations = {
    patients: { type: 'belongs_to' as const, key: 'patient_id' },
  };

  @field('patient_id') patientId!: string;
  @field('doctor_id') doctorId!: string;
  @date('start_time') startTime!: Date;
  @field('status') status!: string;
  @field('appointment_type') appointmentType?: string;

  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  // Helper to get the actual Patient object for this appointment
  @relation('patients', 'patient_id') patient!: Patient;
}