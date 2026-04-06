
import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, initializeFirestore, collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import firebaseConfig from '../../../../firebase-applet-config.json';

/**
 * SOCIETY VISITOR INGEST ENGINE
 * 
 * Captures visitor geolocation via IPinfo and logs to the Society Registry.
 * Uses client SDK architecture for standard security compatibility.
 */

const IPINFO_TOKEN = 'd7762625cef692';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    
    // Extract IP (handling various proxy headers)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || '8.8.8.8';

    // Fetch Geolocation
    const geoResponse = await fetch(`https://ipinfo.io/${ip}?token=${IPINFO_TOKEN}`);
    const geoData = await geoResponse.json();

    if (geoData.error) {
      throw new Error(geoData.error.message || 'IPinfo lookup failed');
    }

    // Parse coordinates
    const [latitude, longitude] = (geoData.loc || '0,0').split(',').map(Number);

    // Initialize Firebase Client (Idempotent)
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
    const dbId = "ai-studio-73577978-c57a-4d16-9fca-7a635e2af192";
    let db;
    try {
      db = initializeFirestore(app, {}, dbId);
    } catch (e) {
      db = getFirestore(app, dbId);
    }
    
    const visitorRef = doc(collection(db, 'live_visitors'));

    const visitorEvent = {
      id: visitorRef.id,
      ipAddress: ip,
      url: url || 'unknown',
      latitude,
      longitude,
      city: geoData.city || 'Unknown',
      postalCode: geoData.postal || '00000',
      timestamp: new Date().toISOString(),
      serverTimestamp: serverTimestamp()
    };

    await setDoc(visitorRef, visitorEvent);

    return NextResponse.json({ success: true, visitorId: visitorRef.id });
  } catch (error: any) {
    // Silent failure log for telemetry monitoring
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
