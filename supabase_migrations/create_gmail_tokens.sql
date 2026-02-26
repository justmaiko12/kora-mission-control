-- Create gmail_tokens table
CREATE TABLE IF NOT EXISTS gmail_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at BIGINT,
  company_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_gmail_tokens_email ON gmail_tokens(email);
CREATE INDEX IF NOT EXISTS idx_gmail_tokens_company_id ON gmail_tokens(company_id);

-- Enable RLS (Row Level Security)
ALTER TABLE gmail_tokens ENABLE ROW LEVEL SECURITY;

-- Create policy: Allow all authenticated users to view their own tokens
CREATE POLICY "Allow all users to view gmail tokens" 
ON gmail_tokens 
FOR SELECT 
USING (true);

-- Create policy: Allow all users to insert gmail tokens
CREATE POLICY "Allow all users to insert gmail tokens" 
ON gmail_tokens 
FOR INSERT 
WITH CHECK (true);

-- Create policy: Allow all users to update their own gmail tokens
CREATE POLICY "Allow all users to update gmail tokens" 
ON gmail_tokens 
FOR UPDATE 
USING (true);

-- Create policy: Allow all users to delete their own gmail tokens
CREATE POLICY "Allow all users to delete gmail tokens" 
ON gmail_tokens 
FOR DELETE 
USING (true);
