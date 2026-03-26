import { apiRequest, apiUpload, apiCreateCaseFromFiles } from './api';
import type { Case, Applicant, ExtractedData } from './types';

/** Migruje starý formát (extractedData[]) na applicants (V2.9). */
function migrateCase(c: Case): Case {
  if (c.applicants && c.applicants.length > 0) return c;
  const arr = Array.isArray(c.extractedData) ? c.extractedData : c.extractedData ? [c.extractedData] : [];
  if (arr.length === 0) {
    const mainId = 'applicant-main';
    return {
      ...c,
      applicants: [{ id: mainId, role: 'hlavni', order: 1 }],
      activeApplicantId: c.activeApplicantId ?? mainId,
    };
  }
  const applicants: Applicant[] = arr
    .sort((a, b) => (a.personIndex ?? 0) - (b.personIndex ?? 0))
    .map((data: ExtractedData, i) => ({
      id: `applicant-${c.id}-${i + 1}`,
      role: i === 0 ? ('hlavni' as const) : ('spoluzadatel' as const),
      order: i + 1,
      extractedData: data,
    }));
  return {
    ...c,
    applicants,
    activeApplicantId: c.activeApplicantId ?? applicants[0]?.id ?? 'applicant-main',
  };
}

export async function getCases(): Promise<Case[]> {
  const list = await apiRequest<Case[]>('/api/cases');
  return (Array.isArray(list) ? list : []).map(migrateCase);
}

export async function getCase(id: string): Promise<Case | null> {
  try {
    const c = await apiRequest<Case>(`/api/cases/${id}`);
    return migrateCase(c);
  } catch {
    return null;
  }
}

export async function saveCase(caseData: Case): Promise<Case> {
  const payload = {
    jmeno: caseData.jmeno,
    datum: caseData.datum,
    status: caseData.status,
    dealStatus: caseData.dealStatus ?? null,
    vyseUveru: caseData.vyseUveru ?? null,
    ucel: caseData.ucel ?? null,
    extractedData: caseData.extractedData,
    applicants: caseData.applicants ?? null,
    activeApplicantId: caseData.activeApplicantId ?? null,
  };

  if (caseData.id && !caseData.id.startsWith('temp-')) {
    const updated = await apiRequest<Case>(`/api/cases/${caseData.id}`, {
      method: 'PATCH',
      body: payload,
    });
    return migrateCase(updated);
  }

  const created = await apiRequest<Case>('/api/cases', {
    method: 'POST',
    body: payload,
  });
  return migrateCase(created);
}

export async function deleteCase(id: string): Promise<void> {
  await apiRequest(`/api/cases/${id}`, { method: 'DELETE' });
}

export async function setActiveCase(id: string): Promise<Case> {
  const result = await apiRequest<Case>(`/api/cases/${id}/active`, {
    method: 'POST',
  });
  return result;
}

/** Změní stav obchodu (pipeline); u leadů z tipaře spustí notifikaci. */
export async function patchCaseStatus(caseId: string, dealStatus: string): Promise<Case> {
  const updated = await apiRequest<Case>(`/api/cases/${caseId}/status`, {
    method: 'PATCH',
    body: { status: dealStatus },
  });
  return migrateCase(updated);
}

/** Vrátí aktivní případ. Při chybě API odmítne promise (volající použije backoff). Při neplatných datech vrací null. */
export async function getActiveCase(): Promise<Case | null> {
  try {
    const data = await apiRequest<{ case: Case | null }>('/api/cases/active/current');
    const c = data?.case ?? null;
    if (!c) return null;
    try {
      return migrateCase(c);
    } catch {
      return null;
    }
  } catch {
    throw new Error('active-case-unavailable');
  }
}

export async function uploadCaseFile(
  caseId: string,
  file: File,
  type: 'op-predni' | 'op-zadni' | 'danove' | 'vypisy',
  applicantId?: string,
  options?: { extract?: boolean }
): Promise<Case> {
  const path = applicantId
    ? `/api/cases/${caseId}/files?applicantId=${encodeURIComponent(applicantId)}`
    : `/api/cases/${caseId}/files`;
  return apiUpload<Case>(path, file, type, options);
}

export async function deleteCaseFile(caseId: string, fileId: string): Promise<Case> {
  const updated = await apiRequest<Case>(`/api/cases/${caseId}/files/${fileId}`, { method: 'DELETE' });
  return migrateCase(updated);
}

export async function reparseDpFromStoredOutput(
  caseId: string,
  applicantId?: string,
  personIndex?: number
): Promise<Case> {
  const query = new URLSearchParams();
  if (applicantId) query.set('applicantId', applicantId);
  if (personIndex != null) query.set('personIndex', String(personIndex));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const updated = await apiRequest<Case>(`/api/cases/${caseId}/dp/reparse${suffix}`, {
    method: 'POST',
    body: {},
  });
  return migrateCase(updated);
}

/** Nahraje raw text z Doctly a parsuje ho jako DP (pro manuální vložení výstupu). */
export async function parseDpFromRawText(
  caseId: string,
  rawText: string,
  applicantId?: string,
  personIndex?: number
): Promise<Case> {
  const query = new URLSearchParams();
  if (applicantId) query.set('applicantId', applicantId);
  if (personIndex != null) query.set('personIndex', String(personIndex));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const updated = await apiRequest<Case>(`/api/cases/${caseId}/dp/parse-raw${suffix}`, {
    method: 'POST',
    body: { rawText },
  });
  return migrateCase(updated);
}

/** Doplní IČ a převažující CZ-NACE z ARES podle DIČ z DP (pouze DIČ ve tvaru CZ + 8 číslic). */
export async function enrichDpFromAres(
  caseId: string,
  applicantId?: string,
  personIndex?: number
): Promise<Case> {
  const query = new URLSearchParams();
  if (applicantId) query.set('applicantId', applicantId);
  if (personIndex != null) query.set('personIndex', String(personIndex));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const updated = await apiRequest<Case>(`/api/cases/${caseId}/dp/ares-enrich${suffix}`, {
    method: 'POST',
    body: {},
  });
  return migrateCase(updated);
}

export async function reparseOpFromStoredOutput(
  caseId: string,
  applicantId?: string,
  personIndex?: number
): Promise<Case> {
  const query = new URLSearchParams();
  if (applicantId) query.set('applicantId', applicantId);
  if (personIndex != null) query.set('personIndex', String(personIndex));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const updated = await apiRequest<Case>(`/api/cases/${caseId}/op/reparse${suffix}`, {
    method: 'POST',
    body: {},
  });
  return migrateCase(updated);
}

export async function reparseVypisyFromStoredOutput(
  caseId: string,
  applicantId?: string,
  personIndex?: number
): Promise<Case> {
  const query = new URLSearchParams();
  if (applicantId) query.set('applicantId', applicantId);
  if (personIndex != null) query.set('personIndex', String(personIndex));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const updated = await apiRequest<Case>(`/api/cases/${caseId}/vypisy/reparse${suffix}`, {
    method: 'POST',
    body: {},
  });
  return migrateCase(updated);
}

/** Vytvoří nový případ z nahraných souborů. Typy se rozpoznají automaticky (OP přední/zadní, daňové, výpisy). */
export async function createCaseFromFiles(files: File[]): Promise<Case> {
  return apiCreateCaseFromFiles<Case>(files);
}
