import apiClient from '../lib/apiClient';

// ---------------------------------------------------------------------------
// Database Service — API layer for the Vault (Database Explorer) screen
// ---------------------------------------------------------------------------
// Mirrors the web's doctorService.js database section.
// Endpoints:
//   GET  /api/database/{source}?q=&timeFilter=  → fetch patients/prescriptions/invoices
//   GET  /api/prescriptions/{id}                → fetch single prescription detail
//   POST /api/database/subscribe-inventory      → subscribe to inventory waitlist
// ---------------------------------------------------------------------------

export type DataSource = 'patients' | 'prescriptions' | 'invoices' | 'inventory';

export interface Patient {
  id: string;
  full_name: string;
  age?: number;
  gender?: string;
  last_visit_date?: string;
  phone_no?: string;
  profile_photo_url?: string;
}

export interface Prescription {
  id: string;
  patients?: { full_name: string };
  created_at: string;
  is_edited?: boolean;
  download_url?: string;
  medications?: { name: string; dosage: string; instructions: string }[];
}

export interface Invoice {
  id: string;
  invoice_number: string;
  patients?: { full_name: string; phone_no?: string };
  issued_date: string;
  grand_total?: number;
  total_amount?: number;
  balance_due?: number;
  status: string;
  due_date?: string;
}

/**
 * Fetch database records by source type with optional search and time filter.
 */
export const fetchDatabaseData = (
  source: DataSource,
  searchTerm: string = '',
  timeFilter: string = 'all'
) => {
  return apiClient.get(`/api/database/${source}`, {
    params: { q: searchTerm, timeFilter },
  });
};

/**
 * Fetch a single prescription by ID (for the detail modal).
 */
export const fetchPrescriptionById = (prescriptionId: string) => {
  return apiClient.get(`/api/prescriptions/${prescriptionId}`);
};

/**
 * Subscribe to the inventory waitlist.
 */
export const subscribeToInventory = (contactInfo: string) => {
  return apiClient.post('/api/database/subscribe-inventory', { contactInfo });
};
