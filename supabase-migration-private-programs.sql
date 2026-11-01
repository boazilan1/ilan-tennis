-- A private lesson the trainee doesn't pay for himself: a program covers it
-- (currently "מהשטח למגרש" and "שיקומי"). The admin records it by hand, and the
-- program's name is kept on the booking so lessons can be counted per program.
alter table private_slot_bookings add column program text;

alter table private_slot_bookings drop constraint private_slot_bookings_payment_method_check;
alter table private_slot_bookings add constraint private_slot_bookings_payment_method_check
  check (payment_method in ('immediate', 'balance', 'manual', 'program'));

-- A booking has a program exactly when it is paid by a program.
alter table private_slot_bookings add constraint private_booking_program_matches
  check ((payment_method = 'program') = (program is not null));
