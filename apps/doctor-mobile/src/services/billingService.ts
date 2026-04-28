import apiClient from '../lib/apiClient';

// ---------------------------------------------------------------------------
// Billing Service — API layer for Invoice Manager, Financials & Billing
// ---------------------------------------------------------------------------

// ── Invoice Manager ──

export interface InvoiceItem {
  id: string;
  invoice_number: string;
  patients?: { full_name: string; phone_no?: string };
  issued_date: string;
  due_date?: string;
  grand_total?: number;
  total_amount?: number;
  balance_due?: number;
  status: string;
}

export const getInvoices = (): Promise<{ data: InvoiceItem[] }> => {
  return apiClient.get('/api/billing/invoices');
};

// ── Wallet / Financials ──

export const getWalletBalance = () => {
  return apiClient.get('/api/billing/wallet');
};

export const getWalletHistory = ({ page = 1, limit = 20 } = {}) => {
  return apiClient.get('/api/billing/wallet/history', { params: { page, limit } });
};

export const getPayoutDetails = () => {
  return apiClient.get('/api/billing/bank-details');
};

export const updatePayoutDetails = (details: Record<string, string>) => {
  return apiClient.post('/api/billing/bank-details', details);
};

export const requestPayout = (amount: number) => {
  return apiClient.post('/api/billing/payout-requests', { amount });
};

export const getPayoutHistory = ({ page = 1, limit = 20 } = {}) => {
  return apiClient.get('/api/billing/payout-requests', { params: { page, limit } });
};

// ── Billing History & Fee ──

export const getBillingHistory = () => {
  return apiClient.get('/api/billing/history');
};

export const getConsultationFee = () => {
  return apiClient.get('/api/billing/fee');
};

export const updateConsultationFee = (fee: number) => {
  return apiClient.put('/api/billing/fee', { fee });
};
