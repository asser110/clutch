-- Create storage bucket for voice notes
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('voice-notes', 'voice-notes', true, 5242880, '{audio/webm,audio/mp3,audio/ogg,audio/wav,audio/mp4}')
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload voice notes
CREATE POLICY "Users can upload their own voice notes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'voice-notes' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access for playback
CREATE POLICY "Anyone can read voice notes"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'voice-notes');

-- Allow users to delete their own voice notes
CREATE POLICY "Users can delete their own voice notes"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'voice-notes' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
