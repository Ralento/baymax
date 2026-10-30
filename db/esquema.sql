-- Expediente médico de Baymax. Cargar: psql -d baymax -f esquema.sql

CREATE TABLE pacientes (
    id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    curp             text UNIQUE CHECK (curp ~ '^[A-Z0-9]{18}$'),
    nombre           text NOT NULL CHECK (nombre <> ''),
    fecha_nacimiento date NOT NULL,  -- "no en el futuro" se valida en la API: un CHECK con current_date rompe al restaurar respaldos
    sexo             text NOT NULL CHECK (sexo IN ('F', 'M', 'X')),
    tipo_sangre      text CHECK (tipo_sangre IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    telefono         text,
    email            text UNIQUE,
    creado_en        timestamptz NOT NULL DEFAULT now()
);

-- Historial médico: enfermedades pasadas, cirugías, alergias, hospitalizaciones y antecedentes familiares.
CREATE TABLE antecedentes (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    paciente_id bigint NOT NULL REFERENCES pacientes ON DELETE CASCADE,
    tipo        text NOT NULL CHECK (tipo IN ('enfermedad', 'cirugia', 'alergia', 'hospitalizacion', 'familiar')),
    descripcion text NOT NULL CHECK (descripcion <> ''),
    fecha       date,
    notas       text
);

-- Cartilla de vacunación: una fila por dosis aplicada.
CREATE TABLE vacunas (
    id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    paciente_id      bigint NOT NULL REFERENCES pacientes ON DELETE CASCADE,
    vacuna           text NOT NULL CHECK (vacuna <> ''),
    dosis            text,
    fecha_aplicacion date NOT NULL,
    lote             text
);

-- Un tratamiento es actual si fecha_fin es NULL o todavía no llega.
CREATE TABLE tratamientos (
    id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    paciente_id  bigint NOT NULL REFERENCES pacientes ON DELETE CASCADE,
    medicamento  text NOT NULL CHECK (medicamento <> ''),
    dosis        text,
    frecuencia   text,
    fecha_inicio date NOT NULL,
    fecha_fin    date CHECK (fecha_fin >= fecha_inicio)
);

CREATE TABLE enfermedades_cronicas (
    id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    paciente_id       bigint NOT NULL REFERENCES pacientes ON DELETE CASCADE,
    enfermedad        text NOT NULL CHECK (enfermedad <> ''),
    degenerativa      boolean NOT NULL DEFAULT false,
    fecha_diagnostico date,
    notas             text
);

-- PostgreSQL no indexa las llaves foráneas solo; el expediente siempre se consulta por paciente.
CREATE INDEX ON antecedentes (paciente_id);
CREATE INDEX ON vacunas (paciente_id);
CREATE INDEX ON tratamientos (paciente_id);
CREATE INDEX ON enfermedades_cronicas (paciente_id);
