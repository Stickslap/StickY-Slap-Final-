# Print Society .co — Workstation

This is the technical infrastructure for **Print Society .co**, a boutique custom printing platform.

## Deployment & Verifying Your Publish

To ensure the most current version of the site is showing:

1.  **Access the Registry**: Go to the [Firebase Console](https://console.firebase.google.com/).
2.  **Monitor Build Logs**: Navigate to **Build > App Hosting** (or Hosting). 
3.  **Verify Build Status**: Ensure the latest commit shows as **Completed**. If a build is "Failed", the live site will continue to show the previous successful version.
4.  **Registry Pulse**: Check the page source of `www.printsocietyco.com`. You should see `<meta name="society-registry-pulse" content="2026-03-20-v1" />` in the `<head>` section.

## Troubleshooting Registry Logs

If you see these entries in your server logs:

### 404 on ACME Challenge
- **Cause**: The SSL system is verifying your domain ownership. 
- **Fix**: This is normal during the first 24 hours of domain setup. Once DNS records propagate, the 404s will stop, and your `https` connection will go live.

### 403 Forbidden
- **Cause**: A request was blocked by security headers or CSRF protection (common in Next.js 15).
- **Fix**: Check `next.config.ts` to ensure your origin is whitelisted in `allowedOrigins`.

### 403 on .env
- **Cause**: Someone tried to access your environment file.
- **Status**: **RESOLVED**. The server correctly blocked this access to protect your secrets.

## Society Directory
- `/` - Public Entrance & Showcase
- `/products` - Collections Lab (Stickers & Specialty Prints)
- `/blog` - Industry Journal (Editorial Dispatch)
- `/dashboard` - Member Registry & Project Tracking
- `/admin` - Administrative Workstation (Staff Only)

## Technical Architecture
- **Framework**: Next.js 15 (App Router)
- **Database**: Firestore (The Society Registry)
- **Authentication**: Firebase Auth (Registry Clearance)
- **Styling**: Tailwind CSS & ShadCN UI
- **AI**: Genkit (Intelligent Pre-press & Support)
