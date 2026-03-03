import { Case } from './types';

const STORAGE_KEY = 'hypo-cases';

export const getCases = (): Case[] => {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveCase = (caseData: Case): void => {
  const cases = getCases();
  const existingIndex = cases.findIndex(c => c.id === caseData.id);
  
  if (existingIndex >= 0) {
    cases[existingIndex] = caseData;
  } else {
    cases.push(caseData);
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
};

export const deleteCase = (id: string): void => {
  const cases = getCases().filter(c => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
};

export const setActiveCase = (id: string): void => {
  const cases = getCases().map(c => ({
    ...c,
    isActive: c.id === id
  }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
};

export const getActiveCase = (): Case | null => {
  const cases = getCases();
  return cases.find(c => c.isActive) || null;
};
