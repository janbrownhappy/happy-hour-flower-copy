// Minimum legal drinking age in the US — this app advertises alcohol-related content.
export const MIN_AGE = 21;

// Returns whole-year age from a YYYY-MM-DD date-of-birth string.
export function getAge(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}

// True when the date-of-birth string represents someone who is at least MIN_AGE.
export function meetsMinimumAge(dob) {
  const age = getAge(dob);
  return age !== null && age >= MIN_AGE;
}