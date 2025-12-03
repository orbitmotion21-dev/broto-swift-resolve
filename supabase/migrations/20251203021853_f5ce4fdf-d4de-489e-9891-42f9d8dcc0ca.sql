-- Add expires_at and room_url columns to video_calls table
ALTER TABLE video_calls ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE video_calls ADD COLUMN IF NOT EXISTS room_url TEXT;

-- Mark old active calls as ended (older than 1 hour)
UPDATE video_calls 
SET status = 'ended', ended_at = NOW()
WHERE status = 'active' 
AND created_at < NOW() - INTERVAL '1 hour';