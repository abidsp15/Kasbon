-- Create custom enum for debt type if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'debt_type') THEN
        CREATE TYPE debt_type AS ENUM ('owed_to_me', 'i_owe');
    END IF;
END$$;

-- Create debts table
CREATE TABLE IF NOT EXISTS debts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type debt_type NOT NULL,
    counterpart_name TEXT NOT NULL CHECK (char_length(counterpart_name) > 0),
    amount BIGINT NOT NULL CHECK (amount >= 0),
    note TEXT CHECK (char_length(note) <= 200),
    due_date DATE NOT NULL DEFAULT CURRENT_DATE,
    settled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Users can view their own debts"
    ON debts FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own debts"
    ON debts FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own debts"
    ON debts FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own debts"
    ON debts FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_debts_updated_at') THEN
        CREATE TRIGGER update_debts_updated_at
            BEFORE UPDATE ON debts
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END$$;
