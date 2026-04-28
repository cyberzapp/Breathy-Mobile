import apiClient from '../lib/apiClient';

// ---------------------------------------------------------------------------
// Organization Service — API layer for Breathy Desk
// ---------------------------------------------------------------------------

export interface Organization {
  id: string;
  name: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
}

/** Fetch all organizations for the logged-in doctor */
export const getOrganizations = (): Promise<Organization[]> => {
  return apiClient.get('/api/organizations');
};

/** Get details of a single organization */
export const getOrganizationDetails = (orgId: string) => {
  return apiClient.get(`/api/organizations/${orgId}`);
};
