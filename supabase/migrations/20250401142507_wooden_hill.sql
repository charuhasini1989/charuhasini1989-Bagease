/*
  # Create Contacts table with RLS policies

  1. New Tables
    - `Contacts`
      - `id` (uuid, primary key)
      - `name` (text)
      - `email` (text)
      - `subject` (text)
      - `message` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `Contacts` table
    - Add policy to allow anyone to insert new contacts
    - No select/update/delete policies needed as this is a one-way submission system
*/

-- Create Contacts table if it doesn't exist
CREATE TABLE IF NOT EXISTS "Contacts" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE "Contacts" ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to insert contacts
CREATE POLICY "Allow anonymous contact submissions"
ON "Contacts"
FOR INSERT
TO public
WITH CHECK (true);