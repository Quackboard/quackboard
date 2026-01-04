-- Add slug column to producers
ALTER TABLE producers ADD COLUMN slug TEXT UNIQUE;

-- Create unique index for faster lookups
CREATE UNIQUE INDEX idx_producers_slug ON producers(slug);