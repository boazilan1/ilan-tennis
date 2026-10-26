-- A private lesson the admin adds by hand for the record — usually one that
-- already took place, or was paid outside the system. No payment link, no
-- message; it counts as done (status 'active') but isn't a system payment.
-- Only the admin can create these: book_private_slot still accepts just
-- 'immediate' and 'balance' from the site.
alter table private_slot_bookings drop constraint private_slot_bookings_payment_method_check;
alter table private_slot_bookings add constraint private_slot_bookings_payment_method_check
  check (payment_method in ('immediate', 'balance', 'manual'));
