-- CRP obrigatório para novos psicólogos (legado null permitido até backfill)
-- App rejeita cadastro sem CRP. Coluna permanece nullable no DB para registros antigos,
-- mas novos inserts via app sempre enviam valor.
-- Opcional: UPDATE psychologists SET crp = 'PENDENTE' WHERE crp IS NULL;
-- alter table psychologists alter column crp set not null;

comment on column public.psychologists.crp is 'CRP obrigatório no cadastro';
