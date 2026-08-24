-- Add country column to projects if it does not already exist
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS country text;

-- Optional: index for faster filtering/grouping by country
CREATE INDEX IF NOT EXISTS idx_projects_country ON public.projects(country);
