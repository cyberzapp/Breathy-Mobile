import apiClient from '../lib/apiClient';

// ---------------------------------------------------------------------------
// Calendar Service — Native mirror of the web's calendar API endpoints
// ---------------------------------------------------------------------------

/** Get calendar events for a date range, with optional filters */
export const getCalendarEvents = (params: {
  startDate: string;
  endDate: string;
  clinicId?: string;
  type?: string;
}): Promise<CalendarEvent[]> =>
  apiClient.get('/api/calendar/events', { params });

/** Get doctor's availability / schedules */
export const getDoctorAvailability = (): Promise<AvailabilityData> =>
  apiClient.get('/api/schedules');

/** Create a manual appointment (booking flow) */
export const createManualAppointment = (data: CreateAppointmentPayload): Promise<any> =>
  apiClient.post('/api/calendar/appointments', data);

/** Quick-add an appointment */
export const createQuickAddAppointment = (data: any): Promise<any> =>
  apiClient.post('/api/calendar/quick-add', data);

/** Update appointment status (confirmed, cancelled, no-show, waiting, completed) */
export const updateAppointmentStatus = (
  appointmentId: string,
  status: string
): Promise<any> =>
  apiClient.put(`/api/calendar/appointments/${appointmentId}/status`, { status });

/** Reschedule an appointment */
export const rescheduleAppointment = (data: {
  appointmentId: string;
  newStartTime: string;
  newEndTime: string;
  reason?: string;
}): Promise<any> =>
  apiClient.put(`/api/calendar/appointments/${data.appointmentId}/reschedule`, {
    newStartTime: data.newStartTime,
    newEndTime: data.newEndTime,
    reason: data.reason,
  });

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  extendedProps: {
    patientName: string;
    patientImage?: string;
    status: 'confirmed' | 'waiting' | 'cancelled' | 'completed' | 'no-show';
    type: 'video' | 'in-person';
    clinicName?: string;
    phone?: string;
    reason?: string;
    [key: string]: any;
  };
}

export interface AvailabilityData {
  clinics: {
    id: string;
    clinic_name: string;
    [key: string]: any;
  }[];
  [key: string]: any;
}

export interface CreateAppointmentPayload {
  startTime: string;
  endTime: string;
  clinicId?: string | null;
  appointmentType: 'in-person' | 'video';
  patientId?: string;
  isNewPatient?: boolean;
  patientData?: {
    fullName: string;
    phone: string;
    dob: string;
    gender: string;
  } | null;
}
