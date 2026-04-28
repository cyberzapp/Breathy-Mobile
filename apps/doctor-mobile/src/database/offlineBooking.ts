import { database } from './index';
import { Q } from '@nozbe/watermelondb';
import Patient from './models/Patient';
import Appointment from './models/Appointment';
import { syncDatabase } from './sync';

// ---------------------------------------------------------------------------
// Offline Booking Service
// ---------------------------------------------------------------------------
// Directly interacts with the local WatermelonDB instance to enable
// fully offline patient creation and appointment booking.
// ---------------------------------------------------------------------------

export interface LocalPatientData {
  fullName: string;
  phoneNo: string;
  gender: string;
}

export interface LocalAppointmentData {
  patientId: string;
  doctorId: string;
  startTime: Date;
  appointmentType: string;
}

/**
 * Searches the local `patients` table by phone number.
 */
export async function searchLocalPatient(phone: string): Promise<Patient | null> {
  try {
    const records = await database.get<Patient>('patients').query(
      Q.where('phone_no', phone)
    ).fetch();
    
    return records.length > 0 ? records[0] : null;
  } catch (error) {
    console.error('Local Patient Search Error:', error);
    throw error;
  }
}

/**
 * Creates a new patient directly in local storage.
 */
export async function createLocalPatient(data: LocalPatientData): Promise<Patient> {
  try {
    let newPatient: Patient;
    await database.write(async () => {
      newPatient = await database.get<Patient>('patients').create((patient) => {
        patient.fullName = data.fullName;
        patient.phoneNo = data.phoneNo;
        patient.gender = data.gender;
        patient.createdAt = new Date();
        patient.updatedAt = new Date();
      });
    });
    
    // Trigger sync to backend in background
    syncDatabase().catch(e => console.log('Background Sync deferred (offline)', e));
    
    return newPatient!;
  } catch (error) {
    console.error('Create Local Patient Error:', error);
    throw error;
  }
}

/**
 * Creates a new appointment directly in local storage.
 */
export async function bookLocalAppointment(data: LocalAppointmentData): Promise<Appointment> {
  try {
    let newAppointment: Appointment;
    await database.write(async () => {
      newAppointment = await database.get<Appointment>('appointments').create((appt) => {
        appt.patientId = data.patientId;
        appt.doctorId = data.doctorId; // Pulled from Auth Store
        appt.startTime = data.startTime;
        appt.status = 'confirmed'; // Default status for new booking
        appt.appointmentType = data.appointmentType;
        appt.createdAt = new Date();
        appt.updatedAt = new Date();
      });
    });

    // Trigger sync to backend in background
    syncDatabase().catch(e => console.log('Background Sync deferred (offline)', e));

    return newAppointment!;
  } catch (error) {
    console.error('Book Local Appointment Error:', error);
    throw error;
  }
}
