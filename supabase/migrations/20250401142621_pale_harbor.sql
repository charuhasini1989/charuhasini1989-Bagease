/*
  # Fix Contacts table RLS policies

  1. Changes
    - Drop existing RLS policies
    - Create new RLS policies for public access
    - Add explicit policy for public inserts

  2. Security
    - Enable RLS on Contacts table
    - Allow public inserts without authentication
    - No select/update/delete policies needed (one-way submission)
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'Contacts' 
    AND policyname = 'Allow anonymous contact submissions'
  ) THEN
    DROP POLICY IF EXISTS "Allow anonymous contact submissions" ON "Contacts";
  END IF;
END $$;

-- Enable RLS (in case it's not enabled)
ALTER TABLE "Contacts" ENABLE ROW LEVEL SECURITY;

-- Create new policy for public inserts
CREATE POLICY "Allow public contact submissions"
ON "Contacts"
FOR INSERT
TO public
WITH CHECK (true);