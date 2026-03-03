import { UserPlus, Trash2, Users } from 'lucide-react';
import type { Applicant } from '../../lib/types';

interface ApplicantPanelsProps {
  applicants: Applicant[];
  activeApplicantId: string;
  onSelect: (applicantId: string) => void;
  onSetMain: (applicantId: string) => void;
  onRemove: (applicantId: string) => void;
  onAdd: () => void;
  /** ID žadatelů jen pro zobrazení (mock) – u nich se nezobrazuje mazání / nastavení hlavního a klik nezmění výběr */
  mockApplicantIds?: Set<string>;
  /** Počet reálných žadatelů (pro tlačítko Přidat); když chybí, použije se applicants.length */
  realApplicantCount?: number;
  /** Vložený režim: neobalovat vlastní kartou (např. uvnitř jednoho bílého okna) */
  embedded?: boolean;
}

function getDisplayName(a: Applicant): string {
  if (a.extractedData) {
    const { jmeno, prijmeni } = a.extractedData;
    if (jmeno || prijmeni) return [jmeno, prijmeni].filter(Boolean).join(' ').trim();
  }
  return a.role === 'hlavni' ? 'Hlavní žadatel' : `Spolužadatel ${a.order - 1}`;
}

function getRc(a: Applicant): string {
  return a.extractedData?.rc ?? '—';
}

export function ApplicantPanels({
  applicants,
  activeApplicantId,
  onSelect,
  onSetMain,
  onRemove,
  onAdd,
  mockApplicantIds = new Set(),
  realApplicantCount,
  embedded = false,
}: ApplicantPanelsProps) {
  if (!applicants.length) return null;

  const realCount = realApplicantCount ?? applicants.length;
  const canAdd = realCount < 4;

  const columnCount = Math.min(applicants.length, 4);

  const content = (
    <div className={embedded ? 'app-applicants-box' : 'p-6'}>
        <div className="app-applicant-header flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-500 shrink-0" aria-hidden />
              <h2 className="text-lg font-semibold text-gray-900">
                Žadatelé ({applicants.length})
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canAdd && (
              <button
                type="button"
                onClick={onAdd}
                className="app-add-applicant-btn p-2 rounded-lg transition-colors"
                title="Přidat žadatele"
                aria-label="Přidat žadatele"
              >
                <UserPlus className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        <div
          className="app-applicant-grid"
          style={{ ['--app-applicant-cols' as string]: columnCount }}
        >
          {applicants.map((a) => {
            const isMock = mockApplicantIds.has(a.id);
            const isActive = activeApplicantId === a.id;
            const isMain = a.role === 'hlavni';
            const canAct = !isMock && realCount > 1;
            const isCoApplicant = !isMain;

            return (
              <div
                key={a.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(a.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(a.id);
                  }
                }}
                className={`app-applicant-card app-applicant-card-height ${isActive ? 'is-active' : ''} ${isMock ? 'is-mock' : ''}`}
                style={{ direction: 'ltr' }}
              >
                <div className={`app-applicant-role-row mb-2 flex-shrink-0 ${isCoApplicant ? 'pr-10' : ''}`}>
                  <span
                    className={`app-applicant-role-dot ${isMain ? 'is-main' : 'is-co'}`}
                    aria-hidden
                  />
                  <span
                    className={`app-applicant-role truncate min-w-0 ${
                      isActive ? 'text-blue-700' : 'text-gray-500'
                    }`}
                  >
                    {isMain ? 'HLAVNÍ ŽADATEL' : 'SPOLUŽADATEL'}
                  </span>
                </div>

                {isCoApplicant && (
                  <div className="app-applicant-delete">
                    <button
                      type="button"
                      data-enabled={canAct ? 'true' : 'false'}
                      aria-disabled={false}
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(a.id);
                      }}
                      className="app-applicant-delete-btn"
                      title={canAct ? 'Smazat žadatele' : 'Ukázková karta – kliknutím zobrazíte info'}
                      aria-label={canAct ? 'Smazat žadatele' : 'Ukázková karta'}
                    >
                      <Trash2 size={16} color="#dc2626" aria-hidden />
                    </button>
                  </div>
                )}

                <div className="app-applicant-text-block">
                  <p
                    className={`font-semibold truncate flex-shrink-0 ${isActive ? 'text-gray-900' : 'text-gray-600'}`}
                  >
                    {getDisplayName(a)}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5 flex-shrink-0">{getRc(a)}</p>
                </div>

                {/* Tlačítko „Nastavit jako hlavního žadatele“ u všech spolužadatelů (u mock disabled) */}
                {isCoApplicant && (
                  <button
                    type="button"
                    disabled={!canAct}
                    onClick={
                      canAct
                        ? (e) => {
                            e.stopPropagation();
                            onSetMain(a.id);
                          }
                        : undefined
                    }
                    className={`app-set-main-btn ${canAct ? 'is-enabled' : 'is-disabled'}`}
                  >
                    Nastavit jako hlavního žadatele
                  </button>
                )}
              </div>
            );
          })}
        </div>
    </div>
  );

  return embedded ? content : <div className="app-card mb-6">{content}</div>;
}
