-- Sibling discount: a reduced monthly price + its own standing-order link,
-- offered automatically when the registering parent already has another
-- child with an active (paying) enrollment.
ALTER TABLE activities ADD COLUMN IF NOT EXISTS sibling_discount_price numeric;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS sibling_payment_link text;
