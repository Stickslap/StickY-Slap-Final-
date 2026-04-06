import { Resend } from 'resend';

/**
 * Society Dispatch Engine - Resend Integration
 * Uses environment variable for transactional registry updates.
 */
export const resend = new Resend(process.env.RESEND_API_KEY);
