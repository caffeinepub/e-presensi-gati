/**
 * Shared validation helpers for attendance form inputs
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates and converts datetime-local string to nanoseconds timestamp
 */
export function validateAndConvertDateTime(datetimeLocal: string): {
  isValid: boolean;
  value?: bigint;
  error?: string;
} {
  if (!datetimeLocal || datetimeLocal.trim() === "") {
    return {
      isValid: false,
      error: "Waktu hadir harus diisi",
    };
  }

  const date = new Date(datetimeLocal);

  // Check if date is valid
  if (Number.isNaN(date.getTime())) {
    return {
      isValid: false,
      error: "Format waktu tidak valid",
    };
  }

  // Convert to nanoseconds
  const nanoTime = BigInt(date.getTime()) * BigInt(1_000_000);

  return {
    isValid: true,
    value: nanoTime,
  };
}

/**
 * Validates age input (must be 0-255)
 */
export function validateAge(ageInput: string | number): {
  isValid: boolean;
  value?: number;
  error?: string;
} {
  const ageStr = typeof ageInput === "string" ? ageInput : String(ageInput);

  if (!ageStr || ageStr.trim() === "") {
    return {
      isValid: false,
      error: "Usia harus diisi",
    };
  }

  const age = Number.parseInt(ageStr, 10);

  if (Number.isNaN(age)) {
    return {
      isValid: false,
      error: "Usia harus berupa angka",
    };
  }

  if (age < 0 || age > 255) {
    return {
      isValid: false,
      error: "Usia harus antara 0-255 tahun",
    };
  }

  return {
    isValid: true,
    value: age,
  };
}

/**
 * Validates all required text fields
 */
export function validateTextField(
  value: string,
  fieldName: string,
): ValidationResult {
  if (!value || value.trim() === "") {
    return {
      isValid: false,
      error: `${fieldName} harus diisi`,
    };
  }

  return {
    isValid: true,
  };
}
