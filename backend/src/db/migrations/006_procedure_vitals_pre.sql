-- Signos vitales pre-procedimiento
ALTER TABLE procedures ADD COLUMN pre_tension_arterial TEXT;
ALTER TABLE procedures ADD COLUMN pre_frecuencia_cardiaca TEXT;
ALTER TABLE procedures ADD COLUMN pre_frecuencia_respiratoria TEXT;
ALTER TABLE procedures ADD COLUMN pre_saturacion_o2 TEXT;
ALTER TABLE procedures ADD COLUMN pre_temperatura TEXT;
ALTER TABLE procedures ADD COLUMN pre_glucemia TEXT;
