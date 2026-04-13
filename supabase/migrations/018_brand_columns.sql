-- Migration 018: Add structured brand identity columns to clients table
-- These JSONB columns allow structured brand data rendering in the Brand Kit tab.

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS brand_colors    JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS brand_fonts     JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS brand_voice     JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS content_pillars JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS target_audience JSONB DEFAULT '{}'::jsonb;

-- Pre-populate Northern Standard's brand data.
-- Find NS by name since we don't have the UUID at migration time.
UPDATE clients
SET
  brand_colors = '[
    {"name":"Navy","hex":"#1B3A5C","role":"Primary"},
    {"name":"Deep Navy","hex":"#0F2640","role":"Dark backgrounds"},
    {"name":"Amber","hex":"#E8732A","role":"Accent/CTAs"},
    {"name":"Ice Blue","hex":"#A8D5E2","role":"Supporting"},
    {"name":"Cloud Gray","hex":"#F2F4F7","role":"Light backgrounds"},
    {"name":"White","hex":"#FFFFFF","role":"Breathing room"}
  ]'::jsonb,
  brand_fonts = '{"headline":"Montserrat","body":"Open Sans"}'::jsonb,
  brand_voice = '{
    "keywords":["Straightforward","Warm","Knowledgeable","Trustworthy","Confident"],
    "description":"A knowledgeable neighbor, not a salesperson. Lead with helpfulness, not pressure.",
    "dos":["Lead with helpfulness","Use plain language","Be confident without bragging","Back up claims with proof points"],
    "donts":["Sound salesy or pushy","Use HVAC jargon","Use generic phrases like ''best in the business''","Make Justin the face — brand leads, not owner"]
  }'::jsonb,
  content_pillars = '[
    {"name":"Trust & Transparency","description":"How we work, upfront pricing, what to expect"},
    {"name":"Education","description":"Help homeowners understand their system"},
    {"name":"Social Proof","description":"Real reviews, job photos, before/after"},
    {"name":"Seasonal Urgency","description":"Timely content tied to weather/season"},
    {"name":"Behind the Scenes","description":"Real technicians, real calls, real work"},
    {"name":"Offers / CTAs","description":"Promotions, tune-up specials, booking pushes"}
  ]'::jsonb,
  target_audience = '{
    "age_range":"30-65",
    "location":"Twin Cities metro (50-mile radius from St. Paul)",
    "traits":["Homeowners","Middle to upper-middle income","Families — comfort and reliability matter"],
    "pain_points":["Fear of being ripped off","Emergency anxiety — furnace dies in January","Decision paralysis — don''t know enough about HVAC","Distrust of contractors — skeptical of recommended repairs","Seasonal dread — worry system won''t make it"]
  }'::jsonb
WHERE name = 'Northern Standard Heating & Air';
