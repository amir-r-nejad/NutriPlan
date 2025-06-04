import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export  function preprocessDataForFirestore(data: Record<string, any> | null | undefined): Record<string, any> | null {
  if (data === null || data === undefined) return null;

  const processedData: Record<string, any> = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const value = data[key];
      if (typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)) { // Check if it's a plain object
        processedData[key] = preprocessDataForFirestore(value); // Recurse for nested objects
      } else if (Array.isArray(value)) {
        processedData[key] = value.map(item => (typeof item === 'object' ? preprocessDataForFirestore(item) : item === undefined ? null : item));
      }
      else {
        processedData[key] = value === undefined ? null : value;
      }
    }
  }
  return processedData;
}