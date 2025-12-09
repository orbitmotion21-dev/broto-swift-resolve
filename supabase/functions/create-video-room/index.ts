import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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

    // Get Zego credentials
    const ZEGO_APP_ID = Deno.env.get('ZEGO_APP_ID');
    const ZEGO_APP_SIGN = Deno.env.get('ZEGO_APP_SIGN');
    
    if (!ZEGO_APP_ID || !ZEGO_APP_SIGN) {
      throw new Error('ZEGO credentials are not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check user role
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    const isAdmin = roles?.role === 'admin';

    // Get complaint details and student info
    const { data: complaint, error: complaintError } = await supabase
      .from('complaints')
      .select('student_id, title')
      .eq('id', complaintId)
      .single();

    if (complaintError || !complaint) {
      return new Response(
        JSON.stringify({ error: 'Complaint not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique room ID for Zego
    const roomId = `brotodesk-${complaintId.substring(0, 8)}-${Date.now()}`;
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    console.log('Creating Zego room:', roomId);

    // Store video call record with room info
    const { data: videoCall, error: videoCallError } = await supabase
      .from('video_calls')
      .insert({
        complaint_id: complaintId,
        room_id: roomId,
        room_url: null, // Zego doesn't use URLs, uses room IDs
        expires_at: expiresAt.toISOString(),
        status: 'active',
        initiated_by_admin: isAdmin,
      })
      .select()
      .single();

    if (videoCallError) {
      console.error('Error storing video call:', videoCallError);
      throw videoCallError;
    }

    // Create notification - notify the other party
    if (isAdmin) {
      // Notify student
      await supabase
        .from('notifications')
        .insert({
          user_id: complaint.student_id,
          type: 'call_request',
          message: `Admin has started a video call regarding: "${complaint.title}"`,
          complaint_id: complaintId,
        });
    }

    return new Response(
      JSON.stringify({
        roomId: roomId,
        appId: parseInt(ZEGO_APP_ID),
        appSign: ZEGO_APP_SIGN,
        videoCallId: videoCall.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-video-room:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
