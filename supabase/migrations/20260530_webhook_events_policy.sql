CREATE POLICY "Deny all public access" 
ON public.stripe_webhook_events 
FOR ALL 
TO public 
USING (false);
