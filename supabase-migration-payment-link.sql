-- מיגרציה: הוספת שדה payment_link לטבלת activities
alter table activities add column if not exists payment_link text;
