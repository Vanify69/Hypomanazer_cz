import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { ArrowLeft, FileText, CheckCircle2, Upload, Zap } from "lucide-react";
import { mockPripady } from "../data/mockData";

export default function DetailPripadu() {
  const { id } = useParams();
  const navigate = useNavigate();
  const pripad = mockPripady.find((p) => p.id === id);

  const [vyseUveru, setVyseUveru] = useState(pripad?.vyseUveru?.toString() || "");
  const [ucel, setUcel] = useState(pripad?.ucel || "");
  const [jeAktivni, setJeAktivni] = useState(pripad?.aktivni || false);

  if (!pripad) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">
            Případ nenalezen
          </h1>
          <Link to="/" className="text-blue-600 hover:underline">
            Zpět na přehled
          </Link>
        </div>
      </div>
    );
  }

  const typySouboru: Record<string, string> = {
    "op-predni": "OP - přední strana",
    "op-zadni": "OP - zadní strana",
    danova: "Daňové přiznání",
    vypisy: "Výpisy z účtu",
  };

  const handleNastavitAktivni = () => {
    setJeAktivni(!jeAktivni);
    // V reálné aplikaci by se zde uložilo do state management
    alert(
      jeAktivni
        ? "Případ byl odebrán z aktivních"
        : "Případ nastaven jako aktivní pro klávesové zkratky"
    );
  };

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-blue-600 hover:underline mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Zpět na přehled
        </Link>

        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">
              {pripad.jmeno}
            </h1>
            <p className="text-gray-500 mt-1">
              Vytvořeno {new Date(pripad.datumVytvoreni).toLocaleDateString("cs-CZ")}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {jeAktivni && (
              <div className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Aktivní případ
              </div>
            )}
            <button
              onClick={handleNastavitAktivni}
              className={`px-6 py-2 rounded-lg transition-colors ${
                jeAktivni
                  ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {jeAktivni ? "Odebrat z aktivních" : "Použít pro zkratky"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Levý sloupec - Podklady */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Podklady
              </h2>

              {pripad.soubory.length > 0 ? (
                <div className="space-y-3">
                  {pripad.soubory.map((soubor) => (
                    <div
                      key={soubor.id}
                      className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-start gap-3">
                        <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {soubor.nazev}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {typySouboru[soubor.typ]}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Žádné soubory</p>
              )}

              <button className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                <Upload className="w-4 h-4" />
                Nahrát další soubory
              </button>
            </div>
          </div>

          {/* Pravý sloupec - Data a editace */}
          <div className="lg:col-span-2 space-y-6">
            {/* Vytažená data */}
            {pripad.vytazenaData && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Vytažená data z dokumentů
                </h2>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-500">Jméno</span>
                    <p className="text-gray-900 mt-1">{pripad.vytazenaData.jmeno}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Příjmení</span>
                    <p className="text-gray-900 mt-1">{pripad.vytazenaData.prijmeni}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Rodné číslo</span>
                    <p className="text-gray-900 mt-1 font-mono">
                      {pripad.vytazenaData.rodneCislo}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Datum narození</span>
                    <p className="text-gray-900 mt-1">
                      {pripad.vytazenaData.datumNarozeni}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Číslo OP</span>
                    <p className="text-gray-900 mt-1 font-mono">
                      {pripad.vytazenaData.cisloOP}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-sm text-gray-500">Adresa</span>
                    <p className="text-gray-900 mt-1">
                      {pripad.vytazenaData.ulice}, {pripad.vytazenaData.mesto},{" "}
                      {pripad.vytazenaData.psc}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Měsíční příjmy</span>
                    <p className="text-gray-900 mt-1 font-medium">
                      {pripad.vytazenaData.prijmy.toLocaleString("cs-CZ")} Kč
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Měsíční výdaje</span>
                    <p className="text-gray-900 mt-1 font-medium">
                      {pripad.vytazenaData.vydaje.toLocaleString("cs-CZ")} Kč
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Editovatelná pole */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Doplňující informace
              </h2>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="vyse-uveru"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Výše úvěru (Kč)
                  </label>
                  <input
                    id="vyse-uveru"
                    type="number"
                    value={vyseUveru}
                    onChange={(e) => setVyseUveru(e.target.value)}
                    placeholder="např. 3500000"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="ucel"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Účel úvěru
                  </label>
                  <textarea
                    id="ucel"
                    value={ucel}
                    onChange={(e) => setUcel(e.target.value)}
                    placeholder="např. Koupě bytu 3+1 v Praze"
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                <button
                  onClick={() => {
                    alert("Data uložena");
                  }}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Uložit změny
                </button>
              </div>
            </div>

            {/* Simulace výstupů z bank */}
            {pripad.vytazenaData && vyseUveru && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Orientační nabídky bank
                </h2>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                          Banka
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">
                          Sazba
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">
                          Splátka (30 let)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-100">
                        <td className="py-3 px-4 text-sm text-gray-900">
                          Komerční banka
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900 text-right">
                          5,49 %
                        </td>
                        <td className="py-3 px-4 text-sm font-medium text-gray-900 text-right">
                          {Math.round(
                            (parseInt(vyseUveru) * 0.0549) / 12 +
                              parseInt(vyseUveru) / 360
                          ).toLocaleString("cs-CZ")}{" "}
                          Kč
                        </td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-3 px-4 text-sm text-gray-900">ČSOB</td>
                        <td className="py-3 px-4 text-sm text-gray-900 text-right">
                          5,69 %
                        </td>
                        <td className="py-3 px-4 text-sm font-medium text-gray-900 text-right">
                          {Math.round(
                            (parseInt(vyseUveru) * 0.0569) / 12 +
                              parseInt(vyseUveru) / 360
                          ).toLocaleString("cs-CZ")}{" "}
                          Kč
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 text-sm text-gray-900">
                          Česká spořitelna
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900 text-right">
                          5,39 %
                        </td>
                        <td className="py-3 px-4 text-sm font-medium text-gray-900 text-right">
                          {Math.round(
                            (parseInt(vyseUveru) * 0.0539) / 12 +
                              parseInt(vyseUveru) / 360
                          ).toLocaleString("cs-CZ")}{" "}
                          Kč
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p className="text-xs text-gray-500 mt-4">
                  * Orientační výpočet, skutečné podmínky se mohou lišit
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
