import { useState, useCallback } from 'react';
import { saveCase } from '../lib/storage';
import type { Case, Applicant } from '../lib/types';

export function useAddCoApplicant(
  caseData: Case | null,
  setCaseData: (c: Case) => void,
  setActiveApplicantId: (id: string) => void
) {
  const [isModalOpen, setModalOpen] = useState(false);
  const [applicantForModal, setApplicantForModal] = useState<Applicant | null>(null);

  const openAddCoApplicant = useCallback(() => {
    if (!caseData) return;
    const applicants = caseData.applicants ?? [];
    if (applicants.length >= 4) {
      alert('Maximálně 4 žadatelé.');
      return;
    }
    const newOrder = applicants.length + 1;
    const newApplicant: Applicant = {
      id: `applicant-${caseData.id}-${Date.now()}`,
      role: newOrder === 1 ? 'hlavni' : 'spoluzadatel',
      order: newOrder,
    };
    setApplicantForModal(newApplicant);
    setModalOpen(true);
    saveCase({
      ...caseData,
      applicants: [...applicants, newApplicant],
      activeApplicantId: newApplicant.id,
    })
      .then((updated) => {
        setCaseData(updated);
        setActiveApplicantId(newApplicant.id);
      })
      .catch((err) => {
        console.error('Přidání spolužadatele selhalo:', err);
        setModalOpen(false);
        setApplicantForModal(null);
        alert('Nepodařilo se uložit spolužadatele. Zkontrolujte připojení a zkuste to znovu.');
      });
  }, [caseData, setCaseData, setActiveApplicantId]);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setApplicantForModal(null);
  }, []);

  const onUploadComplete = useCallback(
    (updated: Case) => {
      setCaseData(updated);
      setApplicantForModal(null);
      setModalOpen(false);
    },
    [setCaseData]
  );

  return {
    openAddCoApplicant,
    isModalOpen,
    applicantForModal,
    closeModal,
    onUploadComplete,
  };
}
