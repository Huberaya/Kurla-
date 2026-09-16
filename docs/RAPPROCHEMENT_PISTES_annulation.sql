-- Annulation du rapprochement — à exécuter dans l'éditeur SQL Supabase.
-- Remet supplier_id à NULL pour les 3 piste(s) reliées.

UPDATE public.sourcing_prospects SET supplier_id = NULL WHERE id = 'c15'; -- Dina Afro Shop
UPDATE public.sourcing_prospects SET supplier_id = NULL WHERE id = 'prosp-blacketique'; -- BLACKETIQUE SASU
UPDATE public.sourcing_prospects SET supplier_id = NULL WHERE id = 'prosp-eolys'; -- EOLYS Beaute

NOTIFY pgrst, 'reload schema';
