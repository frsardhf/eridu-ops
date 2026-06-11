/**
 * Type shapes for SchaleDB-sourced data.
 *
 * Only the fields actually accessed by app code are typed here. The rest of
 * SchaleDB's schema stays loosely typed under StudentProps to avoid churn
 * when SchaleDB adds fields.
 */

/** A single skill-effect entry. `Type` discriminates the rest of the shape. */
interface SchaleSkillEffect {
  Type: string;
  Scale?: number[];
  [key: string]: unknown;
}

/** Fields shared by main skills and ExtraSkills. */
export interface SchaleSkillBase {
  Icon?: string;
  Name?: string;
  Desc?: string;
  Cost?: number[];
  Parameters?: number[][];
  Effects?: SchaleSkillEffect[];
}

/**
 * A regular skill (Ex / Public / Passive / ExtraPassive). `Parameters` is
 * required on the regular form because the calc code reads `.length` from it
 * to derive max level when the per-student cap is missing.
 */
export interface SchaleSkill extends SchaleSkillBase {
  Parameters: number[][];
  ExtraSkills?: SchaleSkillBase[];
}

/**
 * SchaleDB `localization.json` — only the maps the app reads.
 * `BuffName` is a flat map keyed by `Buff_*`, `Debuff_*`, `CC_*`, `Special_*`
 * prefixes; see `fetchLocalizedBuffName`.
 */
export interface SchaleLocalization {
  SquadType: Record<string, string>;
  BulletType: Record<string, string>;
  ArmorType: Record<string, string>;
  TacticRole: Record<string, string>;
  School: Record<string, string>;
  Club: Record<string, string>;
  BuffName: Record<string, string>;
}
