-- Add What's Good Chicago to invoice counters
INSERT INTO invoice_counters (brand, current_number)
VALUES ('What''s Good Chicago', 1)
ON CONFLICT (brand) DO NOTHING;
