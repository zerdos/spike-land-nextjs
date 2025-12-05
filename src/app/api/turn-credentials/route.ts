import { NextResponse } from "next/server";

/**
 * API endpoint to fetch TURN server credentials from Twilio
 * This enables WebRTC connections to work on restrictive networks (4G/5G)
 */
export async function GET() {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      return NextResponse.json(
        { error: "Twilio credentials not configured" },
        { status: 500 },
      );
    }

    // Fetch TURN credentials from Twilio
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Tokens.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Twilio API error: ${response.status}`);
    }

    const data = await response.json();

    // Return ICE servers in RTCIceServer format
    return NextResponse.json({
      iceServers: data.ice_servers,
      ttl: data.ttl,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch TURN credentials" },
      { status: 500 },
    );
  }
}
