-- Prevent duplicate outreach emails per lead+template_type (closes race in draft generation)
ALTER TABLE outreach_emails
  ADD CONSTRAINT outreach_emails_lead_template_unique
  UNIQUE (lead_id, template_type);
