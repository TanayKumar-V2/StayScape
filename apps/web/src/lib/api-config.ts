/**
 * Centralised API configuration.
 *
 * All API base URLs are read from environment variables — never hardcoded.
 * The NEXT_PUBLIC_ prefix makes variables available to the browser bundle.
 */
export const API_BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1';

export const APP_URL = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000';
