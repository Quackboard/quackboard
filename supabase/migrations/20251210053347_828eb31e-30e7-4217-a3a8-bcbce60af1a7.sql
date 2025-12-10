CREATE POLICY "Anyone can view producers" 
ON public.producers 
FOR SELECT 
USING (true);