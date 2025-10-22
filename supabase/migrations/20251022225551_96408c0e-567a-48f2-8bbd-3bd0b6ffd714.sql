-- Allow caregivers to delete their own connections
CREATE POLICY "Caregivers can delete their connections"
ON public.connections
FOR DELETE
USING (auth.uid() = caregiver_id);