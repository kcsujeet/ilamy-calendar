/**
 * Recent ICU writes a no-break or thin space before AM/PM and around a range
 * dash. Tests compare against plain spaces so an assertion is exact on any ICU.
 */
export const plainSpaces = (text: string | null | undefined) =>
	text?.replace(/[\u2009\u202f\u00a0]/g, ' ')
