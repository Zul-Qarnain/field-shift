# Coastal soil salinity — SRDI 2010, Appendix-2

**Source.** SRDI (2010) *Saline Soils of Bangladesh*, Soil Resource Development Institute, SRMAF Project,
Ministry of Agriculture, Government of the People's Republic of Bangladesh (Director: Mainul Ahsan; survey
compiled by Md. Shaheedur Rashid, Md. Anowar Hossain, Md. Nazrul Islam and colleagues).
PDF: <https://objectstorage.ap-dcc-gazipur-1.oraclecloud15.com/n/axvjbnqprylg/b/V2Ministry/o/office-srdi/2024/12/332b4451bed84807b5846a530c6cc28c.pdf>
— fetched **2026-09-30** (3,688,651 bytes, `pdfinfo` Author `MAINUL AHSAN`).

**What is in `srdi_2010_upazila.csv`.** Every row of Appendix-2 "Upazila wise Soil salinity class and area in
coastal saline belt" (printed pp. 31–36): 102 upazilas in 18 districts, with the printed total area,
uncultivated area, cultivated area, total saline area and the area in classes S1 2.0–4.0, S2 4.1–8.0,
S3 8.1–12.0, S4 12.1–16.0, S5 >16.0 dS/m. `gb_adm3` is the geoBoundaries gbOpen ADM3 spelling of the same
upazila, used to answer "which upazila is this point in"; four SRDI upazilas have no gbOpen polygon
(Bagerhat/Kachua, Satkhira/Kaliganj, Narail/Lohagara, Chittagong/C. Sadar) and are left blank rather than
guessed. `srdi_2010_published_totals.json` holds the printed district total rows and the belt grand total.

**Dry-season data.** SRDI states the field survey ran in **May 2009** with 2,500 samples along 3–4 km traverses,
EC determined from a **1:5 soil-water extract** (p.2), and that "most of the land remains fallow in the dry
season (January–May) because of soil salinity" (p.1). The classes are therefore a dry-season snapshot, not an
annual average. Appendix-6 (p.55) calls 0–2 dS/m "salt free … salinity effects are mostly negligible", which is
why the engine charges nothing to the non-saline remainder.

**Checks run** (by `src/acquire/salinity.py`, asserted in `tests/test_salinity.py`):

- S1+S2+S3+S4+S5 = the printed saline area on all 102 rows;
- the recomputed district sums equal the printed total row for all 18 districts, and the belt grand total
  equals the printed 3,072,106 / 907,317 / 1,689,831 / 1,056,260 ha with 328,430 / 274,220 / 189,710 /
  161,980 / 101,920 ha in S1–S5;
- 37 rows print a total area that is **not** cultivated + uncultivated (administrative area includes hill,
  forest reserve and char land; the five rows Appendix-1 marks `*` print the other way round). This is a
  property of the source, reported in the JSON as `areaNote`, not silently corrected.

**Derivations** (in code, never in the CSV): `salineShare = saline_ha / total_ha`, `classShares = class ha /
saline ha`, `repECe` = area-weighted class midpoint with S5 pinned to its 16.0 dS/m lower bound.
Crop response comes from FAO Irrigation and Drainage Paper 29 Rev.1 (Ayers & Westcot 1985), Table 4 and
equation (10) Y = 100 − b·(ECe − a): <https://www.fao.org/4/t0234e/T0234E03.htm> (also fetched 2026-09-30).

**Regenerate:** `/workspace/fs-venv/bin/python src/acquire/salinity.py` → `web/public/data/salinity.json`
(boundary files are cached under `cache/`, which is git-ignored; the JSON is the committed fixture).

**The trimmed extract.** `srdi_2010_appendix2_extract.txt` keeps the printed rows of pages 31–32 (Khulna,
Bagerhat, Satkhira, Jessore, Narail, Barisal — 48 rows including the district total rows) so the western
half of the CSV can be audited without re-downloading the PDF. All 102 CSV rows were checked character-wise
against a fresh `pdftotext -layout` of the downloaded PDF: every one of the 102 nine-number tuples appears
verbatim in that output, and the raw 2,580-line dump was deleted after transcription.

**Name joins and the judgement calls in them.** geoBoundaries spells several units differently, so `gb_adm3`
is one explicit decision per SRDI row, not a fuzzy match: `Fultala→Phultala`, `Rupsha→Rupsa`,
`Paikgacha→Paikgachha`, `Morrellganj→Morrelganj`, `Sharankhola→Sarankhola`, `Ashashuni→Assasuni`,
`Abhoynagar→Abhaynagar`, `Monirampur→Manirampur`, `Jhikargacha→Jhikargachha`, `Banaripara→Banari Para`,
`Gournadi→Gaurnadi`, `Mehindigang→Mehendiganj`, `Kathalia→Kanthalia`, `Nalchiti→Nalchity`,
`Kaukhali→Kawkhali`, `Nesarabad→Nesarabad (Swarupkati)`, `Borhanuddin→Burhanuddin`,
`Charfeshion→Char Fasson`, `Tajumuddin→Tazumuddin`, `Kalapara→Kala Para`, `Mirjaganj→Mirzaganj`,
`Patharghara→Patharghata`, `Raipur→Roypur`, `Shudharam→Noakhali Sadar (Sudharam)`, `Tungipara→Tungi Para`,
`Kotalipara→Kotali Para`, `Sitakundu→Sitakunda`, `Anwara→Anowara`, `Bashkhali→Banshkhali`, `Patia→Patiya`,
`Sandip→Sandwip`, `Ukhiya→Ukhia`, `Tecknaf→Teknaf`, `Moheshkhali→Maheshkhali`, `Daganbhuiya→Daganbhuiyan`,
and the abbreviated head-office rows expanded (`B. Sadar→Bagerhat / Bhola / Barguna Sadar`,
`S. Sadar→Satkhira Sadar`, `P. Sadar→Patuakhali Sadar`, `G. Sadar→Gopalganj Sadar`,
`L. Sadar→Lakshmipur Sadar`, `C. Sadar→Cox's Bazar Sadar`, `Sadar→Narail / Barisal / Jhalokati / Pirojpur Sadar`).

- **`Metro` → `Khulna Sadar`** is a judgement, not a source statement: SRDI's Khulna "Metro" row is the
  city-corporation area, which gbOpen splits into Khulna Sadar, Khalishpur, Sonadanga and others. No demo
  farm resolves there, so no published value depends on it.
- Four rows are left blank because gbOpen ADM3 has no matching polygon: Kachua (Bagerhat), Kaliganj
  (Satkhira), Lohagara (Narail), Chittagong "C. Sadar" (Chattogram city is divided into ~25 thana-level
  units with no single Sadar). A farm in one of those reports "outside SRDI coastal saline survey area"
  with a null value rather than borrowing a neighbour's number.
- District spellings are joined through `DISTRICT_ALIASES` in `salinity.py` (Barishal↔Barisal,
  Jashore↔Jessore, Chattogram↔Chittagong, Cumilla↔Comilla, Bogura↔Bogra, Borguna↔Barguna,
  Gopalgonj↔Gopalganj, Laxmipur↔Lakshmipur, Jhalakathi↔Jhalokati, Cox's↔Cox's Bazar).

**What the six demo farms resolved to** (point-in-polygon on geoBoundaries ADM3, all five polygon vertices
of the Khulna farm also fall in the same unit):

| farm | point | SRDI upazila | saline ha | total ha | salineShare | repECe (derived) |
| --- | --- | --- | --- | --- | --- | --- |
| khulna-09 | 22.8029, 89.4018 | Khulna / Dumuria (p.31) | 30,610 | 44,797 | 0.6833 | 9.19 dS/m |
| barishal-03 | 22.8486, 90.2512 | Barisal / Wazirpur (p.32) | 2,000 | 24,841 | 0.0805 | 3.61 dS/m |
| farm-12 | 24.2514, 89.9152 | Tangail Sadar — not in Appendix-2 | — | — | null | null |
| rajshahi-07 | 24.3636, 88.3277 | no ADM3 polygon contains the point (nearest ADM2: Rajshahi, ~2.1 km) | — | — | null | null |
| rangpur-21 | 25.6486, 89.3517 | Mitha Pukur (Rangpur) — not in Appendix-2 | — | — | null | null |
| sylhet-15 | 24.8026, 92.0521 | Golabganj (Sylhet) — not in Appendix-2 | — | — | null | null |

**URL note.** The link the task passed round had the key `office-srdi/2024-12-332b…pdf` and returns
`{"code":"ObjectNotFound"}` from the Oracle object store; the working key is
`office-srdi/2024/12/332b4451bed84807b5846a530c6cc28c.pdf` (the one used above).
