import { Model } from '@nozbe/watermelondb';
import { field, date, children } from '@nozbe/watermelondb/decorators';
import Appointment from './Appointment';

export default class Patient extends Model {
  static table = 'patients';

  // Associations: A patient has many appointments
  static associations = {
    appointments: { type: 'has_many' as const, foreignKey: 'patient_id' },
  };

  @field('full_name') fullName!: string;
  @field('phone_no') phoneNo?: string;
  @field('email') email?: string;
  @field('profile_photo_url') profilePhotoUrl?: string;
  @field('gender') gender?: string;
  @field('city') city?: string;

  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  // Helper to fetch this patient's appointments
  @children('appointments') appointments!: any;
}