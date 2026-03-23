import { API_BASE, apiRequest } from './api';

const getToken = (): string | null => localStorage.getItem('hypo-token');

export type BankCode = 'RB' | 'UCB';

export interface BankTemplateDto {
  id: string;
  userId: string;
  bankCode: BankCode;
  originalFileName: string;
  mimeType: string;
  storageKey: string;
  mappingStatus: string;
  mappingVersion: number | null;
  contentHash: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BankCalculationResultDto {
  runId: string;
  bankCode: BankCode;
  status: string;
  maxLoanAmount?: number;
  monthlyPayment?: number;
  dsti?: number;
  dti?: number;
  pdsti?: number;
  minRequiredIncome?: number;
  passFail?: string;
  outcomeLabel?: string;
  errorMessage?: string;
}

export interface BankSummaryRowDto {
  bankCode: BankCode;
  bankLabel: string;
  hasTemplate: boolean;
  templateFileName?: string;
  templateUploadedAt?: string;
  mappingStatus?: string;
  lastRun: BankCalculationResultDto | null;
  missingTemplateMessage: string | null;
}

export async function fetchBankTemplates(): Promise<BankTemplateDto[]> {
  return apiRequest<BankTemplateDto[]>('/api/bank-templates');
}

export async function uploadBankTemplate(bankCode: BankCode, file: File): Promise<BankTemplateDto> {
  const token = getToken();
  const form = new FormData();
  form.append('file', file);
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/bank-templates/${bankCode}/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
  } catch (e) {
    throw new Error('Nelze se připojit k serveru.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? `Chyba ${res.status}`);
  return data as BankTemplateDto;
}

export async function validateBankTemplate(bankCode: BankCode): Promise<{
  ok: boolean;
  message: string;
  mappingStatus: string;
}> {
  return apiRequest(`/api/bank-templates/${bankCode}/validate`, { method: 'POST' });
}

export async function fetchCaseBankSummary(caseId: string): Promise<BankSummaryRowDto[]> {
  return apiRequest<BankSummaryRowDto[]>(`/api/bank-calculations/cases/${caseId}/summary`);
}

export async function runBankCalculations(
  caseId: string,
  bankCode?: BankCode
): Promise<BankCalculationResultDto | BankCalculationResultDto[]> {
  return apiRequest(`/api/bank-calculations/cases/${caseId}/run`, {
    method: 'POST',
    body: bankCode ? { bankCode } : {},
  });
}

export async function downloadBankRunFile(runId: string, suggestedName: string): Promise<void> {
  const token = getToken();
  const res = await fetch(`${API_BASE}/api/bank-calculations/runs/${runId}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status === 401) {
    localStorage.removeItem('hypo-token');
    throw new Error('Session vypršela. Přihlaste se znovu.');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error ?? `Chyba ${res.status}`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = suggestedName.endsWith('.xlsm') ? suggestedName : `${suggestedName}.xlsm`;
  a.click();
  URL.revokeObjectURL(url);
}

export function mappingStatusLabel(status: string): string {
  switch (status) {
    case 'VALID':
      return 'Mapování OK';
    case 'INVALID':
      return 'Neplatná šablona';
    case 'NEEDS_REVIEW':
      return 'K ověření';
    case 'UNKNOWN':
    default:
      return 'Neznámý';
  }
}

export function calculationStatusLabel(status: string): string {
  switch (status) {
    case 'SUCCESS':
      return 'Hotovo';
    case 'MOCK':
      return 'Mock výpočet';
    case 'MISSING_TEMPLATE':
      return 'Chybí šablona';
    case 'FAILED':
      return 'Chyba';
    case 'RUNNING':
      return 'Probíhá';
    default:
      return status;
  }
}
