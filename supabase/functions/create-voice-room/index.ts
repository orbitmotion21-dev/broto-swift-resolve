import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate JWT token for VideoSDK
function generateVideoSDKToken(apiKey: string, secret: string, permissions: string[] = ["allow_join"], expirySeconds = 86400): string {
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    apikey: apiKey,
    permissions,
    version: 2,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expirySeconds,
  };

  const encodedHeader = base64Encode(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const encodedPayload = base64Encode(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const data = encoder.encode(`${encodedHeader}.${encodedPayload}`);
  
  // HMAC-SHA256 signature using Web Crypto API
  const cryptoKey = crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  return `${encodedHeader}.${encodedPayload}`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { complaintId } = await req.json();

    if (!complaintId) {
      return new Response(
        JSON.stringify({ error: 'Complaint ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const VIDEOSDK_API_KEY = Deno.env.get('VIDEOSDK_API_KEY');
    const VIDEOSDK_SECRET = Deno.env.get('VIDEOSDK_SECRET');

    if (!VIDEOSDK_API_KEY || !VIDEOSDK_SECRET) {
      console.error('VideoSDK credentials not configured');
      return new Response(
        JSON.stringify({ error: 'VideoSDK not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate server token for creating room
    const serverToken = await generateJWT(VIDEOSDK_API_KEY, VIDEOSDK_SECRET, ["allow_join", "allow_mod"]);

    console.log('Creating VideoSDK room for complaint:', complaintId);

    // Create room using VideoSDK API
    const roomResponse = await fetch('https://api.videosdk.live/v2/rooms', {
      method: 'POST',
      headers: {
        'Authorization': serverToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customRoomId: `brotodesk-${complaintId}-${Date.now()}`,
      }),
    });

    if (!roomResponse.ok) {
      const errorText = await roomResponse.text();
      console.error('VideoSDK room creation failed:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to create video room', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const roomData = await roomResponse.json();
    const roomId = roomData.roomId;

    console.log('VideoSDK room created:', roomId);

    // Generate participant token for clients (24 hour expiry)
    const participantToken = await generateJWT(VIDEOSDK_API_KEY, VIDEOSDK_SECRET, ["allow_join"], 86400);

    // Store in database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const expiresAt = new Date(Date.now() + 86400000); // 24 hours

    // End any existing active calls for this complaint
    await supabase
      .from('video_calls')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('complaint_id', complaintId)
      .eq('status', 'active');

    // Insert new call record
    const { data: videoCall, error: videoCallError } = await supabase
      .from('video_calls')
      .insert({
        complaint_id: complaintId,
        room_id: roomId,
        room_url: `videosdk://${roomId}`,
        expires_at: expiresAt.toISOString(),
        status: 'active',
        initiated_by_admin: true,
      })
      .select()
      .single();

    if (videoCallError) {
      console.error('Failed to save video call:', videoCallError);
      return new Response(
        JSON.stringify({ error: 'Failed to save video call record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get complaint to find student for notification
    const { data: complaint } = await supabase
      .from('complaints')
      .select('student_id, title')
      .eq('id', complaintId)
      .single();

    if (complaint) {
      // Create notification for student
      await supabase
        .from('notifications')
        .insert({
          user_id: complaint.student_id,
          type: 'call_request',
          message: `Admin is requesting a voice call regarding your complaint: "${complaint.title}"`,
          complaint_id: complaintId,
        });
    }

    console.log('Voice call created successfully:', videoCall.id);

    return new Response(
      JSON.stringify({
        success: true,
        roomId,
        token: participantToken,
        videoCallId: videoCall.id,
        expiresAt: expiresAt.toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating voice room:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Generate JWT using Web Crypto API
async function generateJWT(apiKey: string, secret: string, permissions: string[], expirySeconds = 86400): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    apikey: apiKey,
    permissions,
    version: 2,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expirySeconds,
  };

  const encoder = new TextEncoder();
  
  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  
  const keyData = encoder.encode(secret);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    encoder.encode(signatureInput)
  );
  
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  
  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}
