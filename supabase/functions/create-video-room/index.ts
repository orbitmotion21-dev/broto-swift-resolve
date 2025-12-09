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

    // Get Daily.co API key
    const DAILY_API_KEY = Deno.env.get('DAILY_API_KEY');
    if (!DAILY_API_KEY) {
      throw new Error('DAILY_API_KEY is not configured');
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

    // Create Daily.co room with 1 hour expiration
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    
    console.log('Creating Daily.co room...');
    const dailyResponse = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DAILY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        privacy: 'public',
        properties: {
          exp: Math.round(Date.now() / 1000) + 3600, // 1 hour from now
          enable_chat: true,
          enable_screenshare: true,
        },
      }),
    });

    if (!dailyResponse.ok) {
      const error = await dailyResponse.text();
      console.error('Daily.co API error:', error);
      throw new Error('Failed to create video room');
    }

    const roomData = await dailyResponse.json();
    console.log('Room created:', roomData);

    // Store video call record with expiration time and room URL
    const { data: videoCall, error: videoCallError } = await supabase
      .from('video_calls')
      .insert({
        complaint_id: complaintId,
        room_id: roomData.name,
        room_url: roomData.url,
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
    // Note: Students can't create notifications for admins due to RLS

    return new Response(
      JSON.stringify({
        roomUrl: roomData.url,
        roomName: roomData.name,
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
