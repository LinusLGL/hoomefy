// Validation Utilities

import { UPLOAD_CONSTRAINTS } from './constants';

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * Requirements: min 8 chars, uppercase, lowercase, digit
 */
export function validatePassword(password: string): boolean {
  if (password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  return true;
}

/**
 * Get password strength score (0-4)
 */
export function getPasswordStrength(password: string): number {
  let strength = 0;
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;
  return Math.min(strength, 4);
}

/**
 * Validate file is an allowed image type
 */
export function validateFileType(file: File): boolean {
  return UPLOAD_CONSTRAINTS.allowedTypes.includes(file.type);
}

/**
 * Validate file size
 */
export function validateFileSize(file: File): boolean {
  return file.size <= UPLOAD_CONSTRAINTS.maxFileSize && file.size > 0;
}

/**
 * Validate image dimensions
 */
export async function validateImageDimensions(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const isValid =
        img.width >= UPLOAD_CONSTRAINTS.minDimension &&
        img.height >= UPLOAD_CONSTRAINTS.minDimension &&
        img.width <= UPLOAD_CONSTRAINTS.maxDimension &&
        img.height <= UPLOAD_CONSTRAINTS.maxDimension;
      resolve(isValid);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(false);
    };

    img.src = url;
  });
}

/**
 * Verify image format by magic bytes
 */
export async function verifyImageFormat(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      if (!e.target?.result) {
        resolve(false);
        return;
      }

      const arr = new Uint8Array(e.target.result as ArrayBuffer);
      const isJPEG = arr[0] === 0xff && arr[1] === 0xd8 && arr[2] === 0xff;
      const isPNG = arr[0] === 0x89 && arr[1] === 0x50 && arr[2] === 0x4e && arr[3] === 0x47;
      const isWebP =
        arr[0] === 0x52 &&
        arr[1] === 0x49 &&
        arr[2] === 0x46 &&
        arr[3] === 0x46 &&
        arr[8] === 0x57 &&
        arr[9] === 0x45 &&
        arr[10] === 0x42 &&
        arr[11] === 0x50;

      resolve(isJPEG || isPNG || isWebP);
    };

    reader.onerror = () => resolve(false);
    reader.readAsArrayBuffer(file.slice(0, 12));
  });
}

/**
 * Comprehensive image validation
 */
export async function validateImage(file: File): Promise<{
  valid: boolean;
  error?: string;
}> {
  // Check file type
  if (!validateFileType(file)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload a JPEG, PNG, or WebP image.',
    };
  }

  // Check file size
  if (!validateFileSize(file)) {
    return {
      valid: false,
      error: `File is too large. Maximum size is ${UPLOAD_CONSTRAINTS.maxFileSize / 1024 / 1024}MB.`,
    };
  }

  // Verify actual format
  const isValidFormat = await verifyImageFormat(file);
  if (!isValidFormat) {
    return {
      valid: false,
      error: 'Invalid image file. The file may be corrupted.',
    };
  }

  // Check dimensions
  const hasValidDimensions = await validateImageDimensions(file);
  if (!hasValidDimensions) {
    return {
      valid: false,
      error: `Image dimensions must be between ${UPLOAD_CONSTRAINTS.minDimension}px and ${UPLOAD_CONSTRAINTS.maxDimension}px.`,
    };
  }

  return { valid: true };
}
