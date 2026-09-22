-- Set role = 'admin' for giftmpofud@gmail.com and 'user' for all others
UPDATE public.profiles
SET role = 'admin'
WHERE LOWER(email) = 'giftmpofud@gmail.com';

UPDATE public.profiles
SET role = 'user'
WHERE LOWER(email) != 'giftmpofud@gmail.com';
