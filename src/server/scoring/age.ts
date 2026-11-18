/** Whole years between a birth date and a day (both read as UTC dates). */
export function ageOnDate(birthDate: Date, on: Date): number {
  let years = on.getUTCFullYear() - birthDate.getUTCFullYear();
  const beforeBirthday =
    on.getUTCMonth() < birthDate.getUTCMonth() ||
    (on.getUTCMonth() === birthDate.getUTCMonth() &&
      on.getUTCDate() < birthDate.getUTCDate());
  if (beforeBirthday) years -= 1;
  return years;
}
