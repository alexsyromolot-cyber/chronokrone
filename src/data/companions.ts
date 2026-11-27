/**
 * Sammlung „Begleiter“ (Epoche 2): Tiere und Kreaturen, die einer Klasse folgen.
 * Jeder Begleiter gibt seiner Klasse dauerhaft einen Bonus; die vollständige Sammlung
 * gibt zusätzlich +10 % auf alles. Begleiter bleiben bei jedem Sprung erhalten.
 *
 * Fundchance: Jeder Sieg ab Epoche 2 hat FIND_CHANCE, einen neuen Begleiter zu bringen;
 * spätestens nach PITY Siegen ohne Fund kommt garantiert einer (Glücksschutz).
 */
import type { ClassId } from './units';

export interface CompanionDef {
  id: string;
  classId: ClassId;
  kind: 'damage' | 'production';
  bonus: number;
}

export const COMPANIONS: CompanionDef[] = [
  { id: 'battleGoose', classId: 'knight', kind: 'damage', bonus: 0.15 },
  { id: 'robotCat', classId: 'woodcutter', kind: 'production', bonus: 0.15 },
  { id: 'steamPony', classId: 'steamKnight', kind: 'damage', bonus: 0.2 },
  { id: 'mineCanary', classId: 'miner', kind: 'production', bonus: 0.15 },
  { id: 'owlProfessor', classId: 'monk', kind: 'production', bonus: 0.15 },
  { id: 'toadFamiliar', classId: 'warlock', kind: 'damage', bonus: 0.15 },
  { id: 'hawk', classId: 'archer', kind: 'damage', bonus: 0.15 },
  { id: 'coalMole', classId: 'stoker', kind: 'production', bonus: 0.2 },
];

export const COMPANION_RULES = {
  fromEpoch: 2,
  findChance: 0.35,
  pity: 3,
  /** Alle Begleiter gefunden: +10 % auf Produktion und Schaden. */
  setBonus: 0.1,
} as const;
