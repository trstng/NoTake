-- Create position_calculation_jobs table for tracking batch processing progress
CREATE TABLE IF NOT EXISTS position_calculation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    total_trades INTEGER NOT NULL DEFAULT 0,
    processed_trades INTEGER NOT NULL DEFAULT 0,
    batch_size INTEGER NOT NULL DEFAULT 500,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for faster lookups
CREATE INDEX idx_position_calculation_jobs_user_id ON position_calculation_jobs(user_id);

-- Create index on status for filtering active jobs
CREATE INDEX idx_position_calculation_jobs_status ON position_calculation_jobs(status);

-- Enable Row Level Security
ALTER TABLE position_calculation_jobs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own calculation jobs"
    ON position_calculation_jobs
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own calculation jobs"
    ON position_calculation_jobs
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calculation jobs"
    ON position_calculation_jobs
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_position_calculation_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_position_calculation_jobs_updated_at
    BEFORE UPDATE ON position_calculation_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_position_calculation_jobs_updated_at();
