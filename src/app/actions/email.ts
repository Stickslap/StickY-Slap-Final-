
'use server';

import { resend } from '@/lib/resend';
import { EmailTemplate, EmailBlock } from '@/lib/types';
import { getFriendlyErrorMessage, logError } from '@/lib/error-handler';

const STORE_LOGO_URL = "https://res.cloudinary.com/dabgothkm/image/upload/v1743789000/sticky-slap-logo.png";

/**
 * Society Dispatch Engine: Unified system for template-based notifications.
 * Receives the template object from the client to avoid server-side Firebase initialization.
 */
export async function dispatchSocietyEmail(
  template: EmailTemplate, 
  recipientEmail: string, 
  data: Record<string, any>
) {
  try {
    if (!template) {
      return { success: false, error: 'No template provided for dispatch.' };
    }

    // Resolve Dynamic Subject
    let subject = template.subject || 'Registry Update';
    Object.entries(data).forEach(([key, val]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(regex, String(val));
    });

    const html = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06); border: 1px solid #eeeeee;">
            
            <!-- Society Blueprint Header: Professional Unified Ingest -->
            <div style="padding: 32px; border-bottom: 1px solid #f0f0f0; text-align: center; background-color: ${template.header?.bgColor || '#ffffff'};">
              <img src="${template.header?.logoUrl || STORE_LOGO_URL}" style="height: 40px; width: auto; display: block; margin: 0 auto;" alt="Logo" />
            </div>

            <div style="padding: 40px 30px;">
              ${renderBlocksToHtml(template.blocks || [], data, template.header?.logoUrl)}
            </div>

            <div style="margin-top: 40px; text-align: center; border-top: 1px solid #f0f0f0; padding: 30px; background-color: #fafafa;">
              <p style="font-size: 10px; color: #aaaaaa; text-transform: uppercase; letter-spacing: 2px; margin: 0; font-weight: bold;">Sticky Slap — High Precision Correspondence</p>
              <p style="font-size: 8px; color: #cccccc; margin-top: 12px; line-height: 1.4;">This is an automated system dispatch from the Society Lab.<br/>Internal Registry Ref: ${data.order_id || 'GENERAL'}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const response = await resend.emails.send({
      from: `${template.senderName || 'Sticky Slap'} <lab@stickyslap.com>`,
      to: [recipientEmail],
      replyTo: template.replyTo || 'lab@stickyslap.com',
      subject: subject,
      html: html,
    });

    if (response.error) {
      logError(response.error, 'Email Dispatch');
      return { success: false, error: getFriendlyErrorMessage(new Error(response.error.message)) };
    }

    return { success: true, id: response.data?.id };
  } catch (e: any) {
    logError(e, 'Email Dispatch Fatal');
    return { success: false, error: getFriendlyErrorMessage(e) };
  }
}

/**
 * Diagnostic Action: Verifies Resend Configuration
 */
export async function verifySocietyDispatch(email: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Sticky Slap <lab@stickyslap.com>',
      to: [email],
      subject: 'Registry Verification: Connection Active',
      html: `
        <div style="font-family: sans-serif; padding: 40px; border: 2px solid #eeeeee; border-radius: 20px;">
          <h1 style="text-transform: uppercase; font-style: italic; letter-spacing: -1px;">Connection <span style="color: #957DAD;">Verified</span></h1>
          <p>Your Resend API integration is now operational within the Society Dispatch Engine.</p>
          <hr style="border: none; border-top: 1px solid #eeeeee; margin: 20px 0;" />
          <p style="font-size: 10px; color: #aaaaaa; text-transform: uppercase;">Time: ${new Date().toLocaleString()}</p>
        </div>
      `
    });
    if (error) throw error;
    return { success: true, id: data?.id };
  } catch (e) {
    console.error('Diagnostic Failure:', e);
    return { success: false, error: e };
  }
}

/**
 * Translates Registry Blocks to Responsive Email HTML
 */
function renderBlocksToHtml(blocks: EmailBlock[], data: Record<string, any>, globalLogo?: string) {
  return blocks.map(block => {
    let content = block.content || '';
    let label = block.label || '';
    let link = block.link || '';

    const replace = (str: string) => {
      let res = str;
      Object.entries(data).forEach(([key, val]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        res = res.replace(regex, String(val));
      });
      return res;
    };

    content = replace(content);
    label = replace(label);
    link = replace(link);

    switch (block.type) {
      case 'logo':
        return `<div style="text-align: ${block.alignment || 'center'}; padding: 20px 0;"><img src="${block.url || globalLogo}" style="height: 40px; width: auto; display: block; margin: 0 auto;" /></div>`;
      
      case 'text':
        return `<div style="margin-bottom: 24px; line-height: 1.6; color: #333333; font-size: 16px; text-align: ${block.alignment || 'left'}; font-family: sans-serif;">${content.replace(/\n/g, '<br/>')}</div>`;
      
      case 'button':
        // Ensure the dash is only added if not already present in the label
        const displayLabel = label.endsWith('—') ? label : `${label} —`;
        return `
          <div style="text-align: ${block.alignment || 'center'}; margin: 40px 0;">
            <a href="${link}" style="background-color: #000000; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 10px; font-weight: bold; text-transform: uppercase; font-size: 13px; letter-spacing: 1px; display: inline-block;">
              ${displayLabel}
            </a>
          </div>`;
      
      case 'divider':
        return `<hr style="border: none; border-top: 1px solid #eeeeee; margin: 40px 0;" />`;
      
      case 'order_summary':
        return `
          <div style="background: #fdfdfd; padding: 24px; border-radius: 16px; margin-bottom: 30px; border: 2px solid #f4f4f4;">
            <h4 style="margin: 0 0 12px 0; text-transform: uppercase; font-size: 10px; color: #aaaaaa; letter-spacing: 1px; font-weight: 900;">Registry Summary</h4>
            <p style="margin: 0; font-weight: bold; font-size: 18px; color: #000000;">Project #${data.order_id || 'UNKNOWN'}</p>
            <div style="margin-top: 12px; display: flex; align-items: center; gap: 10px;">
              <span style="background: #000; color: #fff; font-size: 9px; padding: 4px 8px; border-radius: 4px; font-weight: bold; text-transform: uppercase;">Status: ${data.order_status || 'Submitted'}</span>
            </div>
          </div>`;

      case 'artwork_preview':
        return `
          <div style="text-align: center; margin: 30px 0; border: 2px dashed #eeeeee; border-radius: 20px; padding: 20px;">
            <p style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #aaaaaa; margin-bottom: 15px;">Latest Production Proof</p>
            <img src="${data.proof_url || 'https://picsum.photos/seed/placeholder/400/400'}" style="max-width: 100%; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);" />
          </div>`;

      case 'contract_legal':
        return `
          <div style="margin-top: 30px; padding: 24px; background-color: #f9f9f9; border: 1px solid #eeeeee; border-radius: 12px; font-size: 12px; color: #666666; font-family: sans-serif;">
            <h4 style="margin: 0 0 12px 0; color: #000000; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; font-weight: 900;">Digital Signature Record</h4>
            <div style="margin-bottom: 16px; border-bottom: 1px dashed #dddddd; padding-bottom: 12px;">
              <p style="margin: 4px 0;"><strong>Signatory:</strong> ${data.customer_name || 'Member'}</p>
              <p style="margin: 4px 0;"><strong>IP Address:</strong> ${data.ip_address || '0.0.0.0'}</p>
              <p style="margin: 4px 0;"><strong>Date Signed:</strong> ${data.signed_at || new Date().toLocaleString()}</p>
            </div>
            <p style="margin: 0; font-weight: bold; color: #000000; text-transform: uppercase; font-size: 10px; margin-bottom: 8px;">Agreement Summary:</p>
            <p style="margin: 0; line-height: 1.5;">Customer acknowledges that all sales are FINAL for custom products. This binding agreement confirms authorization for the uploaded designs and waives the right to unjustified chargebacks under the E-SIGN Act. Production results from this digital authorization.</p>
          </div>`;

      default:
        return '';
    }
  }).join('');
}
