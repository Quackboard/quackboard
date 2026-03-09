CREATE UNIQUE INDEX bookings_unique_active_slot 
ON bookings (event_id, slot_position) 
WHERE cancelled_at IS NULL;