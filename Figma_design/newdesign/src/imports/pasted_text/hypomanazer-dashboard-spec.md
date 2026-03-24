Navrhujeme nový hlavní dashboard aplikace HypoManažer (hypoteční CRM).
Současný dashboard je příliš zaměřený na „Přehled případů“. Potřebujeme z něj udělat operativní řídicí panel, který každý den ukáže to nejdůležitější: co je potřeba řešit hned teď.

Dashboard má být samostatná „home“ obrazovka. Stránka „Případy“ zůstane samostatně.

Primární cíl dashboardu
Rychle ukázat priority dne.
Zvýšit rychlost zpracování leadů.
Zlepšit přehled nad pipeline případů.
Dát orientační tržní kontext přes marketingovou sekci sazeb bank.
Cílový uživatel
Hypoteční poradce / obchodník:

potřebuje ráno během 30 sekund vědět, co řešit,
pracuje paralelně s leady, případy, událostmi a follow-upy,
preferuje jasné KPI, krátké seznamy a rychlé akce.
Informační architektura dashboardu
1) Header
Titulek: Dashboard
Podtitulek: např. Přehled dne a priorit
Vpravo rychlé akce (primary buttons):
Nový lead
Nový případ
Přidat událost
2) KPI lišta (horní přehled)
Navrhni 6 KPI karet:

Nové leady (24h / 7 dní)
Čeká na zpracování
Podklady odevzdány
Události dnes
Případy v procesu
Uzavřené případy
Každá karta:

velké číslo,
malý kontext (např. +/− proti minulému týdnu),
klik = přechod na relevantní stránku/filtr.
3) Hlavní pracovní oblast (2 sloupce desktop)
Levý sloupec (prioritní, širší)
Widget A: Čeká na zpracování

seznam 5–10 leadů
řádek: jméno, kontakt, zdroj, čas vytvoření, status badge
akce: Otevřít, Kontaktovat, Zpracovat
Widget B: Podklady odevzdány klientem

seznam leadů/případů, kde klient odevzdal podklady
řádek: jméno, datum odevzdání, typ podkladů, navázaný případ
akce: Zkontrolovat, Převést na případ, Otevřít detail
Pravý sloupec
Widget C: Nadcházející události

5–8 nejbližších událostí
typ (schůzka/telefonát/úkol/připomínka), datum+čas, vazba na klienta/případ
CTA: Zobrazit kalendář
Widget D: Rychlé akce

dlaždice:
Nový lead
Vygenerovat intake odkaz
Odeslat odkaz klientovi
Nový případ
Přidat událost
Synchronizovat kalendář
4) Pipeline případy (samostatná sekce)
Zobraz „sales funnel“ souhrn podle obchodních stavů případů.

Skupiny pro dashboard:
Rozpracované

NEW
DATA_EXTRACTED
Ve schvalování / procesu

SENT_TO_BANK
APPROVED
SIGNED_BY_CLIENT
Uzavřené

CLOSED
LOST
Design:

buď 3 velké segmenty, nebo horizontální funnel bar.
u „Uzavřené“ ukaž mini breakdown Uzavřeno vs Ztraceno.
5) Sekce „Aktuální sazby bank“ (marketingově orientační)
Cíl: orientace uživatele, ne závazná kalkulace.

Každá karta banky:

logo banky,
název banky,
Sazba od X,XX %,
doplňující text (např. Fixace 3 roky, orientačně),
Aktualizováno: DD.MM.YYYY.
Pod sekcí povinný disclaimer: Sazby jsou orientační a mohou se lišit dle bonity klienta, LTV a podmínek konkrétní banky.

Důležitá business pravidla pro obsah widgetů
Leady – priorita dashboardu
Čeká na zpracování = leady, které vyžadují aktivní práci poradce
(typicky DRAFT, SENT, OPENED, IN_PROGRESS).
Podklady odevzdány = leady se stavem SUBMITTED (případně i navazující CONVERTED v sekundárním pohledu).
Případy – zobrazovat obchodně, ne technicky
Použít výše uvedené 3 skupiny pipeline.
Nezobrazovat uživateli surové technické stavy bez byznys kontextu.

UX požadavky
Dashboard musí být „action-first“ (každý blok má jasnou akci).
Vizuální hierarchie:
čeká na zpracování,
podklady odevzdány,
dnešní/nejbližší události,
pipeline,
marketingové sazby.
Maximální čitelnost:
krátké řádky,
jasné badge,
konzistentní ikony,
minimum vizuálního šumu.
Empty states musí motivovat k akci (např. „Žádné leady čekající na zpracování“ + CTA „Vytvořit lead“).
Vizuální styl
Moderní B2B SaaS, card-based layout.
Konzistence s existující aplikací (blue/gray paleta, zaoblení, stíny, badge systém).
Komponenty: KPI card, list row, badge, filter chip, CTA button, section header, bank rate card.
Responsive varianty (nutné)
Navrhnout 3 breakpointy:

Desktop 1440
Tablet 1024
Mobil 390
Chování na mobilu
KPI jako horizontální scroll nebo 2×N grid.
Hlavní widgety pod sebou v prioritním pořadí.
Sticky quick action FAB / spodní akční lišta volitelně.
Stavy obrazovek (nutné dodat ve Figmě)
Pro celý dashboard navrhnout:

Default (loaded)
Loading (skeletony pro KPI i seznamy)
Empty states
Error/Warning state (např. výpadek kalendáře/sazeb)
Hover/focus/active states u interaktivních prvků
Mikrocopy (čeština)
Používej konzistentně:

Čeká na zpracování
Podklady odevzdány
Nadcházející události
Případy v procesu
Uzavřené případy
Aktuální sazby bank
Zobrazit vše
Otevřít detail
Kontaktovat
Zpracovat
Co má být výstup z Figma Make
Kompletní návrh dashboardu (desktop/tablet/mobil).
Komponentní knihovna dashboardových prvků.
1 varianta „dense“ (víc dat) a 1 varianta „clean“ (méně dat).
Klikací prototyp klíčových flow:
z lead widgetu do detailu leadu,
z události do kalendáře,
z pipeline do seznamu případů,
ze sazeb bank do detailu banky.