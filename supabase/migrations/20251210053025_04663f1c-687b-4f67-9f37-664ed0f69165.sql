INSERT INTO producers (id, email, name, venue_name, bio_markdown) 
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'demo@quackboard.com',
  'Comedy Underground',
  'The Laugh Factory',
  'Your weekly dose of stand-up comedy in the heart of downtown. Open mic every Tuesday and Thursday!'
);

INSERT INTO events (id, producer_id, title, description, venue_name, venue_address, date, start_time, end_time, status)
VALUES 
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Tuesday Open Mic', 'Weekly open mic night - 5 minutes per comic', 'The Laugh Factory', '123 Comedy Lane, Downtown', CURRENT_DATE, '20:00', '23:00', 'published'),
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Thursday Showcase', 'Best of the week showcase', 'The Laugh Factory', '123 Comedy Lane, Downtown', CURRENT_DATE + 2, '21:00', '23:30', 'published'),
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Weekend Special', 'Special weekend comedy night', 'The Laugh Factory', '123 Comedy Lane, Downtown', CURRENT_DATE + 5, '19:00', '22:00', 'published');