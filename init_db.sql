-- Crear tabla de Usuarios (Catálogo Maestro)
CREATE TABLE usuarios (
    id_sistema SERIAL PRIMARY KEY,
    huella_id INT UNIQUE NOT NULL, -- El ID que genera el sensor AS608
    nombre VARCHAR(100) DEFAULT 'Nuevo Usuario',
    ci VARCHAR(20),
    correo VARCHAR(100),
    telefono VARCHAR(20),
    estado VARCHAR(20) DEFAULT 'activo',
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de Historial de Accesos (Transaccional)
CREATE TABLE registros_acceso (
    id_registro SERIAL PRIMARY KEY,
    huella_id INT REFERENCES usuarios(huella_id) ON DELETE CASCADE,
    fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado_acceso VARCHAR(20), -- 'permitido' o 'denegado'
    tipo_marca VARCHAR(20) DEFAULT 'asistencia' -- Puede ser 'asistencia', 'atraso', 'falta'
);

-- Insertar un usuario administrador de prueba
INSERT INTO usuarios (huella_id, nombre, ci, correo, telefono) 
VALUES (1, 'Ruben Condori', '12345678', 'admin@cea.edu', '77712345');
