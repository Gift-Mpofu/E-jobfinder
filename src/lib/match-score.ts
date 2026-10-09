/**
 * Skill-overlap score shared by the dashboard, Find Jobs and Swipe pages.
 * Returns null when there is nothing to compare (no profile skills or the job
 * has not been categorised yet), so the UI can say so instead of guessing.
 */
export function calcMatchScore(
  userSkills: string[] | null | undefined,
  jobSkills: string[] | null | undefined,
  seniority?: string | null,
  experienceLevel?: string | null
): number | null {
  const us = (userSkills ?? []).map((s) => s.toLowerCase().trim()).filter(Boolean);
  const js = (jobSkills ?? []).map((s) => s.toLowerCase().trim()).filter(Boolean);
  if (!us.length || !js.length) return null;

  const matched = js.filter((j) => us.includes(j)).length;
  let score = Math.round((matched / js.length) * 100);
  // Jobs with only one or two tags are often miscategorised; avoid false 100%s.
  if (js.length <= 2) score = Math.min(score, 65);

  if (experienceLevel && seniority) {
    const e = experienceLevel.toLowerCase();
    const s = seniority.toLowerCase();
    if ((e.includes('senior') && s.includes('junior')) || (e.includes('junior') && s.includes('senior'))) {
      score -= 20;
    }
  }
  return Math.min(Math.max(score, 0), 99);
}
