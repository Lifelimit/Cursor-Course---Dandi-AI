-- Create a function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, plan)
  VALUES (
    new.id::text,
    new.email,
    new.raw_user_meta_data->>'full_name',
    'Hobby'
  );
  RETURN new;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Fix existing missing profiles
INSERT INTO public.profiles (id, email, plan)
SELECT u.id::text, u.email, 'Hobby'
FROM auth.users u
LEFT JOIN public.profiles p ON u.id::text = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
