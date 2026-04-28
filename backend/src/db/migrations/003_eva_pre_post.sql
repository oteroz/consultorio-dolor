-- EVA antes y después del procedimiento: para medir outcome
ALTER TABLE procedures ADD COLUMN eva_pre INTEGER;
ALTER TABLE procedures ADD COLUMN eva_post INTEGER;
