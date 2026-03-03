/**
 * Extrakce strukturovaných dat z textu OP pomocí LLM (OpenAI-compatible API).
 * Když je nastaven OPENAI_API_KEY, použije se místo/vedle regex parseru pro spolehlivější výstup.
 */

export interface LlmExtractedPerson {
  jmeno: string;
  prijmeni: string;
  rc: string;
  adresa: string;
  datumNarozeni?: string;
  mistoNarozeni?: string;
  pohlavi?: string;
  narodnost?: string;
  rodinnyStav?: string;
  cisloDokladu?: string;
  datumVydani?: string;
  platnostDo?: string;
  vydavajiciUrad?: string;
}

const SYSTEM_PROMPT = `Jsi asistent pro extrakci dat z českého občanského průkazu (OP). 
Dostaneš surový text OCR z přední a/nebo zadní strany OP.

Pravidla:
- jmeno: křestní jméno – VŽDY ber z třetího řádku MRZ (za << je GIVEN NAMES, např. ONDREJ → "Ondřej"). S českou diakritikou.
- prijmeni: příjmení – VŽDY ber z třetího řádku MRZ (před << je SURNAME, např. NADVORNIK → "Nádvorník"). S českou diakritikou.
- rc: rodné číslo – VŽDY ber ze ZADNÍ strany (řádek s "RODNÉ ČÍSLO" / "PERSONAL NO."), tvar XXXXXX/XXXX.
- adresa: trvalý pobyt – pouze ulice, č.p., obec, okr. Bez štítků "Trvalý pobyt", bez RČ a bez MRZ. Piš s malými písmeny a diakritikou (Vyškytná nad Jihlavou).
- datumNarozeni: datum narození – formát DD.MM.YYYY (např. 16.11.1975). Můžeš odvodit z rodného čísla (YYMMDD).
- mistoNarozeni: místo narození – obec, město. Prázdný řetězec pokud není uvedeno.
- pohlavi: "Muž" nebo "Žena" (ne M/Ž). Můžeš odvodit z rodného čísla (měsíc 51–62 = žena).
- narodnost: státní občanství – pro české občany vždy "Česká republika". Prázdný řetězec pokud není uvedeno.
- rodinnyStav: svobodný, ženatý, vdaná, rozvedený, vdovec, vdova. Prázdný řetězec pokud není uvedeno.
- cisloDokladu: číslo občanského průkazu (např. 123456789). Z MRZ řádku 1 nebo z textu.
- datumVydani: datum vydání OP – formát DD.MM.YYYY. Prázdný řetězec pokud není uvedeno.
- platnostDo: datum konce platnosti OP – formát DD.MM.YYYY. Z MRZ řádku 2 nebo z textu.
- vydavajiciUrad: úřad, který OP vydal (např. Magistrát města Brna). Prázdný řetězec pokud není uvedeno.

Vrať JSON objekt se všemi poli: jmeno, prijmeni, rc, adresa, datumNarozeni, mistoNarozeni, pohlavi, narodnost, rodinnyStav, cisloDokladu, datumVydani, platnostDo, vydavajiciUrad.
Prázdný řetězec pro pole, která nelze určit. Odvoď datum a pohlaví z RČ pokud chybí.
Odpověz POUZE platným JSON objektem bez markdown.`;

function buildUserPrompt(ocrText: string): string {
  return `Text z OP (OCR):\n\n${ocrText.slice(0, 6000)}\n\nVrať JSON: { "jmeno": "...", "prijmeni": "...", "rc": "...", "adresa": "...", "datumNarozeni": "...", "mistoNarozeni": "...", "pohlavi": "Muž|Žena", "narodnost": "Česká republika", "rodinnyStav": "...", "cisloDokladu": "...", "datumVydani": "DD.MM.YYYY", "platnostDo": "DD.MM.YYYY", "vydavajiciUrad": "..." }`;
}

export function isLlmAvailable(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

/**
 * Z rozpoznaného OCR textu (přední + zadní strana OP) vytáhne jméno, příjmení, RČ a adresu pomocí LLM.
 * Při chybě nebo chybějícím API klíči vrací null (volající použije regex fallback).
 */
export async function extractPersonFromOpWithLlm(ocrText: string): Promise<LlmExtractedPerson | null> {
  const apiKey = (process.env.OPENAI_API_KEY ?? "").trim();
  if (!apiKey) {
    console.log("[LLM] OPENAI_API_KEY není nastaven, přeskočeno");
    return null;
  }

  const url = process.env.OPENAI_API_BASE_URL || "https://api.openai.com/v1/chat/completions";
  const model = process.env.OPENAI_MODEL || "gpt-5-mini";

  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(ocrText) },
    ],
    response_format: { type: "json_object" as const },
    temperature: 0.1,
    max_completion_tokens: 500,
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[LLM] API chyba:", res.status, errText);
      return null;
    }

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.error("[LLM] Prázdná odpověď");
      return null;
    }

    const parsed = JSON.parse(content) as Record<string, unknown>;
    const rc = String(parsed.rc ?? "").trim();
    const result: LlmExtractedPerson = {
      jmeno: String(parsed.jmeno ?? "").trim(),
      prijmeni: String(parsed.prijmeni ?? "").trim(),
      rc,
      adresa: String(parsed.adresa ?? "").trim(),
      datumNarozeni: String(parsed.datumNarozeni ?? "").trim() || undefined,
      mistoNarozeni: String(parsed.mistoNarozeni ?? "").trim() || undefined,
      pohlavi: String(parsed.pohlavi ?? "").trim() || undefined,
      narodnost: String(parsed.narodnost ?? "").trim() || undefined,
      rodinnyStav: String(parsed.rodinnyStav ?? "").trim() || undefined,
      cisloDokladu: String(parsed.cisloDokladu ?? "").trim() || undefined,
      datumVydani: String(parsed.datumVydani ?? "").trim() || undefined,
      platnostDo: String(parsed.platnostDo ?? "").trim() || undefined,
      vydavajiciUrad: String(parsed.vydavajiciUrad ?? "").trim() || undefined,
    };
    console.log("[LLM] Vytaženo:", result.jmeno, result.prijmeni, result.rc ? "RČ OK" : "RČ prázdné");
    return result;
  } catch (err) {
    console.error("[LLM] Chyba volání:", err);
    return null;
  }
}
