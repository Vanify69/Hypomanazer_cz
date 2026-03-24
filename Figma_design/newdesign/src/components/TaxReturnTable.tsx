import { KompletniDPData } from '../lib/types';

interface TaxReturnTableProps {
  data: KompletniDPData;
  formatCurrency: (value: number) => string;
  hideEmptyRows?: boolean;
}

export function TaxReturnTable({ data, formatCurrency, hideEmptyRows = false }: TaxReturnTableProps) {
  // Helper funkce pro kontrolu, zda má řádek hodnotu
  const hasValue = (value: any): boolean => {
    if (value === undefined || value === null) return false;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') return value.trim() !== '';
    if (typeof value === 'boolean') return true;
    return false;
  };

  // Helper funkce pro filtrování řádků
  const filterRows = (rows: Array<{ num: any; key: string; label: string; highlight?: boolean }>) => {
    if (!hideEmptyRows) return rows;
    return rows.filter(row => hasValue(data[row.key as keyof KompletniDPData]));
  };

  // Helper funkce pro kontrolu, zda má oddíl alespoň jednu hodnotu
  const sectionHasValues = (rows: Array<{ num: any; key: string; label: string; highlight?: boolean }>) => {
    if (!hideEmptyRows) return true;
    return rows.some(row => hasValue(data[row.key as keyof KompletniDPData]));
  };

  // Definice všech oddílů
  const section2Rows = [
    { num: 31, key: 'radek31', label: 'Úhrn příjmů od všech zaměstnavatelů' },
    { num: 32, key: 'radek32', label: '(neobsazeno)' },
    { num: 33, key: 'radek33', label: 'Daň zaplacená v zahraničí' },
    { num: 34, key: 'radek34', label: 'Dílčí základ daně (§6)' },
    { num: 35, key: 'radek35', label: 'Úhrn příjmů ze zahraničí' },
    { num: 36, key: 'radek36', label: 'Dílčí základ daně ze závislé činnosti' },
    { num: 37, key: 'radek37', label: 'Dílčí základ daně (§7)' },
    { num: 38, key: 'radek38', label: 'Dílčí základ daně (§8)' },
    { num: 39, key: 'radek39', label: 'Dílčí základ daně (§9)' },
    { num: 40, key: 'radek40', label: 'Dílčí základ daně (§10)' },
    { num: 41, key: 'radek41', label: 'Úhrn řádků 37–40' },
    { num: 42, key: 'radek42', label: 'Základ daně' },
    { num: 43, key: 'radek43', label: '(neobsazeno)' },
    { num: 44, key: 'radek44', label: 'Uplatňovaná ztráta' },
    { num: 45, key: 'radek45', label: 'Základ daně po odečtení ztráty' },
  ];

  const section3Rows = [
    { num: 46, key: 'radek46', label: 'Dary (§15)' },
    { num: 47, key: 'radek47', label: 'Úroky (§15)' },
    { num: 48, key: 'radek48', label: 'Penzijní produkty' },
    { num: 49, key: 'radek49', label: 'Životní pojištění' },
    { num: 50, key: 'radek50', label: 'Dlouhodobý investiční produkt' },
    { num: 51, key: 'radek51', label: 'Pojištění dlouhodobé péče' },
    { num: 52, key: 'radek52', label: 'Výzkum a vývoj' },
    { num: 53, key: 'radek53', label: 'Odborné vzdělávání' },
    { num: 54, key: 'radek54', label: 'Úhrn nezdanitelných částí' },
    { num: 55, key: 'radek55', label: 'Základ daně po odečtení' },
    { num: 56, key: 'radek56', label: 'Zaokrouhlený základ daně' },
    { num: 57, key: 'radek57', label: 'Daň podle §16' },
  ];

  const section4Rows = [
    { num: 58, key: 'radek58', label: 'Daň podle §16' },
    { num: 59, key: 'radek59', label: '(neobsazeno)' },
    { num: 60, key: 'radek60', label: 'Daň zaokrouhlená' },
    { num: 61, key: 'radek61', label: 'Daňová ztráta' },
  ];

  const section5Rows = [
    { num: 62, key: 'radek62', label: 'Slevy podle §35' },
    { num: '62a', key: 'radek62a', label: 'Sleva – zastavená exekuce' },
    { num: 63, key: 'radek63', label: 'Sleva §35a/35b' },
    { num: 64, key: 'radek64', label: 'Základní sleva na poplatníka' },
    { num: '65a', key: 'radek65a', label: 'Sleva na manželku/manžela' },
    { num: '65b', key: 'radek65b', label: 'Sleva na manželku (ZTP/P)' },
    { num: 66, key: 'radek66', label: 'Invalidita 1.–2. stupeň' },
    { num: 67, key: 'radek67', label: 'Invalidita 3. stupeň' },
    { num: 68, key: 'radek68', label: 'Držitel ZTP/P' },
    { num: 69, key: 'radek69', label: '(neobsazeno)' },
    { num: '69a', key: 'radek69a', label: '(neobsazeno)' },
    { num: '69b', key: 'radek69b', label: '(neobsazeno)' },
    { num: 70, key: 'radek70', label: 'Úhrn slev' },
    { num: 71, key: 'radek71', label: 'Daň po slevách' },
    { num: 72, key: 'radek72', label: 'Daňové zvýhodnění na dítě' },
    { num: 73, key: 'radek73', label: 'Uplatněná sleva na dítě' },
    { num: 74, key: 'radek74', label: 'Daň po zvýhodnění' },
    { num: '74a', key: 'radek74a', label: 'Daň podle §16a' },
    { num: 75, key: 'radek75', label: 'Daň celkem' },
    { num: 76, key: 'radek76', label: 'Daňový bonus' },
    { num: 77, key: 'radek77', label: 'Daň po úpravě o bonus' },
    { num: '77a', key: 'radek77a', label: 'Bonus po odpočtu daně' },
  ];

  const section6Rows = [
    { num: 78, key: 'radek78', label: 'Poslední známá daň' },
    { num: 79, key: 'radek79', label: 'Zjištěná daň' },
    { num: 80, key: 'radek80', label: 'Rozdíl' },
    { num: 81, key: 'radek81', label: 'Poslední známá daňová ztráta' },
    { num: 82, key: 'radek82', label: 'Zjištěná ztráta' },
    { num: 83, key: 'radek83', label: 'Rozdíl ztrát' },
  ];

  const section7Rows = [
    { num: 84, key: 'radek84', label: 'Sražené zálohy' },
    { num: 85, key: 'radek85', label: 'Zaplacené zálohy' },
    { num: 86, key: 'radek86', label: 'Zálohy – paušální režim' },
    { num: 87, key: 'radek87', label: 'Sražená daň §36/6' },
    { num: '87a', key: 'radek87a', label: 'Sražená daň §36/7' },
    { num: 88, key: 'radek88', label: 'Zajištěná daň' },
    { num: 89, key: 'radek89', label: 'Vyplacené bonusy' },
    { num: 90, key: 'radek90', label: 'Zaplacená daňová povinnost' },
    { num: 91, key: 'radek91', label: 'Zbývá doplatit' },
  ];

  const priloha1Rows = [
    { num: 101, key: 'radek101', label: 'Příjmy podle §7' },
    { num: 102, key: 'radek102', label: 'Výdaje podle §7' },
    { num: 103, key: 'radek103', label: 'Daňová ztráta' },
    { num: 104, key: 'radek104', label: 'Rozdíl příjmy/výdaje' },
    { num: 105, key: 'radek105', label: 'Úpravy zvyšující' },
    { num: 106, key: 'radek106', label: 'Úpravy snižující' },
    { num: 107, key: 'radek107', label: 'Rozdělené příjmy' },
    { num: 108, key: 'radek108', label: 'Rozdělené výdaje' },
    { num: 109, key: 'radek109', label: 'Příjmy jako spolupracující osoba' },
    { num: 110, key: 'radek110', label: 'Výdaje jako spolupracující osoba' },
    { num: 111, key: 'radek111', label: '(neobsazeno)' },
    { num: 112, key: 'radek112', label: 'Podíl společníka' },
    { num: 113, key: 'radek113', label: 'Dílčí základ daně §7' },
  ];

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-300 dark:border-gray-600">
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-600 w-16">Ř</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-600">Položka</th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-600 w-32">Hodnota</th>
          </tr>
        </thead>
        <tbody>
          {/* 2. ODDÍL - Dílčí základ daně, základ daně, ztráta */}
          {sectionHasValues(section2Rows) && (
            <>
              <tr className="bg-blue-50 dark:bg-blue-900/20">
                <td colSpan={3} className="px-3 py-2 font-semibold text-gray-900 dark:text-white text-xs">
                  2. ODDÍL – Dílčí základ daně, základ daně, ztráta
                </td>
              </tr>
              {filterRows(section2Rows).map(({ num, key, label }) => {
                const value = data[key as keyof KompletniDPData];
                return (
                  <tr key={key} className="border-b border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600">
                    <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300 font-mono text-xs">{num}</td>
                    <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300">{label}</td>
                    <td className="px-3 py-2.5 text-right font-medium text-gray-900 dark:text-white">
                      {value !== undefined ? formatCurrency(value as number) : ''}
                    </td>
                  </tr>
                );
              })}
            </>
          )}
          
          {/* 3. ODDÍL - Nezdanitelné části základu daně, odčitatelné položky a daň */}
          {sectionHasValues(section3Rows) && (
            <>
              <tr className="bg-blue-50 dark:bg-blue-900/20">
                <td colSpan={3} className="px-3 py-2 font-semibold text-gray-900 dark:text-white text-xs">
                  3. ODDÍL – Nezdanitelné části základu daně, odčitatelné položky a daň
                </td>
              </tr>
              {filterRows(section3Rows).map(({ num, key, label }) => {
                const value = data[key as keyof KompletniDPData];
                return (
                  <tr key={key} className="border-b border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600">
                    <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300 font-mono text-xs">{num}</td>
                    <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300">{label}</td>
                    <td className="px-3 py-2.5 text-right font-medium text-gray-900 dark:text-white">
                      {value !== undefined ? formatCurrency(value as number) : ''}
                    </td>
                  </tr>
                );
              })}
            </>
          )}
          
          {/* 4. ODDÍL - Daň celkem, ztráta */}
          {sectionHasValues(section4Rows) && (
            <>
              <tr className="bg-blue-50 dark:bg-blue-900/20">
                <td colSpan={3} className="px-3 py-2 font-semibold text-gray-900 dark:text-white text-xs">
                  4. ODDÍL – Daň celkem, ztráta
                </td>
              </tr>
              {filterRows(section4Rows).map(({ num, key, label }) => {
                const value = data[key as keyof KompletniDPData];
                return (
                  <tr key={key} className="border-b border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600">
                    <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300 font-mono text-xs">{num}</td>
                    <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300">{label}</td>
                    <td className="px-3 py-2.5 text-right font-medium text-gray-900 dark:text-white">
                      {value !== undefined ? formatCurrency(value as number) : ''}
                    </td>
                  </tr>
                );
              })}
            </>
          )}
          
          {/* 5. ODDÍL - Uplatnění slev na dani a daňového zvýhodnění */}
          {sectionHasValues(section5Rows) && (
            <>
              <tr className="bg-blue-50 dark:bg-blue-900/20">
                <td colSpan={3} className="px-3 py-2 font-semibold text-gray-900 dark:text-white text-xs">
                  5. ODDÍL – Uplatnění slev na dani a daňového zvýhodnění
                </td>
              </tr>
              {filterRows(section5Rows).map(({ num, key, label }) => {
                const value = data[key as keyof KompletniDPData];
                return (
                  <tr key={key} className="border-b border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600">
                    <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300 font-mono text-xs">{num}</td>
                    <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300">{label}</td>
                    <td className="px-3 py-2.5 text-right font-medium text-gray-900 dark:text-white">
                      {value !== undefined ? formatCurrency(value as number) : ''}
                    </td>
                  </tr>
                );
              })}
            </>
          )}
          
          {/* 6. ODDÍL - Dodatečné DAP */}
          {sectionHasValues(section6Rows) && (
            <>
              <tr className="bg-blue-50 dark:bg-blue-900/20">
                <td colSpan={3} className="px-3 py-2 font-semibold text-gray-900 dark:text-white text-xs">
                  6. ODDÍL – Dodatečné DAP
                </td>
              </tr>
              {filterRows(section6Rows).map(({ num, key, label }) => {
                const value = data[key as keyof KompletniDPData];
                return (
                  <tr key={key} className="border-b border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600">
                    <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300 font-mono text-xs">{num}</td>
                    <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300">{label}</td>
                    <td className="px-3 py-2.5 text-right font-medium text-gray-900 dark:text-white">
                      {value !== undefined ? formatCurrency(value as number) : ''}
                    </td>
                  </tr>
                );
              })}
            </>
          )}
          
          {/* 7. ODDÍL - Placení daně */}
          {sectionHasValues(section7Rows) && (
            <>
              <tr className="bg-blue-50">
                <td colSpan={3} className="px-3 py-2 font-semibold text-gray-900 text-xs">
                  7. ODDÍL – Placení daně
                </td>
              </tr>
              {filterRows(section7Rows).map(({ num, key, label }) => {
                const value = data[key as keyof KompletniDPData];
                return (
                  <tr key={key} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-3 py-2.5 text-gray-700 font-mono text-xs">{num}</td>
                    <td className="px-3 py-2.5 text-gray-700">{label}</td>
                    <td className="px-3 py-2.5 text-right font-medium text-gray-900">
                      {value !== undefined ? formatCurrency(value as number) : ''}
                    </td>
                  </tr>
                );
              })}
            </>
          )}
          
          {/* Příloha č. 1 - Přehled příjmů a výdajů podle §7 */}
          {sectionHasValues(priloha1Rows) && (
            <>
              <tr className="bg-blue-50 dark:bg-blue-900/20">
                <td colSpan={3} className="px-3 py-2 font-semibold text-gray-900 dark:text-white text-xs">
                  Příloha č. 1 – Přehled příjmů a výdajů podle §7
                </td>
              </tr>
              {filterRows(priloha1Rows).map(({ num, key, label }) => {
                const value = data[key as keyof KompletniDPData];
                return (
                  <tr key={key} className="border-b border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600">
                    <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300 font-mono text-xs">{num}</td>
                    <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300">{label}</td>
                    <td className="px-3 py-2.5 text-right font-medium text-gray-900 dark:text-white">
                      {value !== undefined ? formatCurrency(value as number) : ''}
                    </td>
                  </tr>
                );
              })}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}