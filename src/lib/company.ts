/** Stored as live_jobs.company when an ad does not name the employer. */
export const CONFIDENTIAL_EMPLOYER = 'Confidential employer';

const COMPANY_COLOURS = ['#FF6B00', '#007AFF', '#34C759', '#FF9F0A', '#AF52DE', '#FF2D55', '#5AC8FA', '#1D9E75'];

export function getCompanyColour(name: string | null | undefined) {
  if (!name || name === CONFIDENTIAL_EMPLOYER) return '#8E8E93';
  return COMPANY_COLOURS[name.charCodeAt(0) % COMPANY_COLOURS.length];
}
