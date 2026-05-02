import apiClient from '../lib/apiClient';
import { supabase } from '../lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

export interface TreatmentPlan {
  id: string;
  title: string;
  diagnosis: string;
  goals?: string;
  start_date: string;
  status: string;
  treatment_plan_entries?: { id: string; created_at: string; notes: string }[];
}


export const emrService = {
  getPatientTimeline: async (patientId: string) => {
    const response = await apiClient.get(`/api/emr/patient/${patientId}/timeline`);
    return response.data; // Assuming apiClient automatically handles generic unwrapping, or we do it here. 
    // Usually apiClient returns the raw response or the JSON body depending on how axios is configured.
    // Let's assume response.data contains the { success: true, data: [...] } structure.
  },

  getPatientTreatmentPlans: async (patientId: string) => {
    const response = await apiClient.get(`/api/emr/plans/patient/${patientId}`);
    return response.data;
  },

  createTreatmentPlan: async (data: { patient_id: string; title: string; diagnosis: string; goals?: string }) => {
    const response = await apiClient.post('/api/emr/plans', data);
    return response.data;
  },

  addTreatmentPlanEntry: async (planId: string, notes: string) => {
    const response = await apiClient.post(`/api/emr/plans/${planId}/entries`, { notes });
    return response.data;
  },

  createClinicalNote: async (data: { appointment_id: string; patient_id: string; note_content: any }) => {
    const response = await apiClient.post('/api/emr/notes', data);
    return response.data;
  },

  updateClinicalNote: async (noteId: string, data: { note_content: any }) => {
    const response = await apiClient.put(`/api/emr/notes/${noteId}`, data);
    return response.data;
  },

  deleteClinicalNote: async (noteId: string) => {
    const response = await apiClient.delete(`/api/emr/notes/${noteId}`);
    return response.data;
  },

  createHealthRecord: async (data: any) => {
    const response = await apiClient.post('/api/database/health-records', data);
    return response.data;
  },

  deleteHealthRecord: async (recordId: string) => {
    const response = await apiClient.delete(`/api/database/health-records/${recordId}`);
    return response.data;
  },

  deleteTreatmentPlan: async (planId: string) => {
    const response = await apiClient.delete(`/api/emr/plans/${planId}`);
    return response.data;
  },

  uploadHealthRecordFile: async (file: { uri: string; name: string; type: string }) => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) throw new Error('User is not authenticated. Cannot upload file.');

    const filePath = `${session.user.id}/${uuidv4()}-${file.name}`;
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type || 'application/octet-stream',
    } as any);

    const { error } = await supabase.storage.from('health-records').upload(filePath, formData, {
      contentType: file.type,
      upsert: true,
    });

    if (error) {
      console.error('Supabase upload error:', error);
      throw error;
    }

    return {
      storage_path: filePath,
      file_name: file.name,
      mime_type: file.type,
    };
  }
};
