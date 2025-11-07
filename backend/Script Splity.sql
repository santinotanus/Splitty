/* =========================================
   SCRIPT SQL COMPLETO - SPLITTY CON FIREBASE
   
   CAMBIOS:
   - firebase_uid como identificador principal (NOT NULL)
   - Sin password_hash, correo_verificado, verif_codigo
   - Firebase maneja toda la autenticación
   - firebase_uid tiene índice único
========================================= */

/* =========================================
   ELIMINAR TABLAS SI EXISTEN (Para facilitar re-ejecución)
========================================= */
DROP TABLE IF EXISTS dbo.saldos_grupo;
DROP TABLE IF EXISTS dbo.ledger;
DROP TABLE IF EXISTS dbo.liquidaciones;
DROP TABLE IF EXISTS dbo.divisiones_gasto;
DROP TABLE IF EXISTS dbo.gastos;
DROP TABLE IF EXISTS dbo.miembros_grupo;
DROP TABLE IF EXISTS dbo.grupos;
DROP TABLE IF EXISTS dbo.solicitudes_amistad;
DROP TABLE IF EXISTS dbo.amistades;
DROP TABLE IF EXISTS dbo.usuarios;
GO

/* =========================================
   TABLA: usuarios
   
   🔥 FIREBASE AUTH:
   - firebase_uid: identificador único de Firebase Auth (NOT NULL)
   - correo: obligatorio y único (sincronizado desde Firebase)
   - nombre y fechaNacimiento: datos adicionales del usuario
   - Firebase maneja: contraseñas, verificación de email, códigos
========================================= */
CREATE TABLE dbo.usuarios (
  id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
  
  -- 🔥 Firebase UID (identificador principal - REQUERIDO)
  firebase_uid NVARCHAR(128) NOT NULL UNIQUE,
  
  nombre NVARCHAR(120) NOT NULL,
  correo NVARCHAR(255) NOT NULL UNIQUE,
  fechaNacimiento DATE NOT NULL,
  
  -- Auditoría
  fecha_creacion DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

-- Índice para búsquedas rápidas por correo
CREATE INDEX IX_usuarios_correo ON dbo.usuarios(correo);
GO

/* ===========================
   TABLA: amistades
   - una fila por amistad confirmada
   - orden canónico (usuario_a < usuario_b)
   - ON DELETE NO ACTION para evitar ciclos
=========================== */
CREATE TABLE dbo.amistades (
  usuario_a UNIQUEIDENTIFIER NOT NULL
    REFERENCES dbo.usuarios(id) ON DELETE NO ACTION,
  usuario_b UNIQUEIDENTIFIER NOT NULL
    REFERENCES dbo.usuarios(id) ON DELETE NO ACTION,
  fecha_alta DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),

  CONSTRAINT PK_amistades PRIMARY KEY (usuario_a, usuario_b),
  CONSTRAINT CK_amistades_orden CHECK (usuario_a < usuario_b)
);
GO

CREATE INDEX IX_amistades_a ON dbo.amistades (usuario_a, fecha_alta DESC);
CREATE INDEX IX_amistades_b ON dbo.amistades (usuario_b, fecha_alta DESC);
GO

/* ===========================
   TABLA: solicitudes_amistad
   - flujo: pendiente → aceptada / rechazada
   - unicidad de pendiente por par (A↔B)
   - ON DELETE NO ACTION para evitar ciclos
=========================== */
CREATE TABLE dbo.solicitudes_amistad (
  id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,

  solicitante_id UNIQUEIDENTIFIER NOT NULL
    REFERENCES dbo.usuarios(id) ON DELETE NO ACTION,

  receptor_id UNIQUEIDENTIFIER NOT NULL
    REFERENCES dbo.usuarios(id) ON DELETE NO ACTION,

  estado VARCHAR(12) NOT NULL
    CHECK (estado IN ('pendiente','aceptada','rechazada')),

  fecha_creacion DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),

  -- par canónico (no importa la dirección)
  par_low   AS (CASE WHEN solicitante_id < receptor_id THEN solicitante_id ELSE receptor_id END) PERSISTED,
  par_high AS (CASE WHEN solicitante_id < receptor_id THEN receptor_id    ELSE solicitante_id END) PERSISTED,

  CONSTRAINT CK_sol_amistad_distintos CHECK (solicitante_id <> receptor_id)
);
GO

-- Evita dobles solicitudes PENDIENTES entre el mismo par
CREATE UNIQUE INDEX UX_sol_amistad_pendiente_par
  ON dbo.solicitudes_amistad (par_low, par_high)
  WHERE estado = 'pendiente';
GO

CREATE INDEX IX_sol_enviadas ON dbo.solicitudes_amistad (solicitante_id, estado, fecha_creacion DESC);
CREATE INDEX IX_sol_recibidas ON dbo.solicitudes_amistad (receptor_id,   estado, fecha_creacion DESC);
GO

/* =========================================
   TABLA: grupos
   Conjuntos de usuarios donde se comparten gastos.
========================================= */
CREATE TABLE dbo.grupos (
  id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
  nombre NVARCHAR(120) NOT NULL,
  descripcion NVARCHAR(400),
  fecha_creacion DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

/* =========================================
   TABLA: miembros_grupo
   Relación usuario ↔ grupo (membresía y rol).
========================================= */
CREATE TABLE dbo.miembros_grupo (
  grupo_id    UNIQUEIDENTIFIER NOT NULL
    REFERENCES dbo.grupos(id) ON DELETE CASCADE,
  usuario_id UNIQUEIDENTIFIER NOT NULL
    REFERENCES dbo.usuarios(id) ON DELETE CASCADE,
  rol NVARCHAR(40) NULL DEFAULT 'miembro',
  fecha_creacion DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT PK_miembros_grupo PRIMARY KEY (grupo_id, usuario_id)
);
GO

CREATE INDEX IX_miembros_por_usuario ON dbo.miembros_grupo (usuario_id);
GO

/* =========================================
   TABLA: gastos
   Evento: alguien paga X dentro de un grupo.
========================================= */
CREATE TABLE dbo.gastos (
  id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
  grupo_id UNIQUEIDENTIFIER NOT NULL
    REFERENCES dbo.grupos(id) ON DELETE CASCADE,
  pagador_id UNIQUEIDENTIFIER NOT NULL,
  descripcion NVARCHAR(300) NULL,
  importe DECIMAL(12,2) NOT NULL CHECK (importe > 0),
  lugar NVARCHAR(200) NULL,
  fecha_pago DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),

  -- Único compuesto para referenciar por (id, grupo_id)
  CONSTRAINT UQ_gastos_id_grupo UNIQUE (id, grupo_id),

  -- El pagador debe ser miembro del grupo
  CONSTRAINT FK_gasto_pagador_es_miembro
    FOREIGN KEY (grupo_id, pagador_id)
    REFERENCES dbo.miembros_grupo (grupo_id, usuario_id)
);
GO

CREATE INDEX IX_gastos_grupo_fecha ON dbo.gastos (grupo_id, fecha_pago DESC);
CREATE INDEX IX_gastos_pagador      ON dbo.gastos (pagador_id);
GO

/* =========================================
   TABLA: divisiones_gasto
   Cómo se reparte un gasto entre participantes (importe o %).
   Valida que el participante pertenezca al mismo grupo del gasto.
========================================= */
CREATE TABLE dbo.divisiones_gasto (
  gasto_id    UNIQUEIDENTIFIER NOT NULL,
  grupo_id    UNIQUEIDENTIFIER NOT NULL,
  usuario_id UNIQUEIDENTIFIER NOT NULL,

  parte_importe    DECIMAL(12,2) NULL CHECK (parte_importe >= 0),
  parte_porcentaje DECIMAL(8,2)  NULL CHECK (parte_porcentaje BETWEEN 0 AND 100),

  CONSTRAINT PK_divisiones_gasto PRIMARY KEY (gasto_id, usuario_id),

  -- Debe apuntar a un gasto del mismo grupo
  CONSTRAINT FK_div_gasto
    FOREIGN KEY (gasto_id, grupo_id)
    REFERENCES dbo.gastos (id, grupo_id) ON DELETE CASCADE,

  -- El participante debe ser miembro del grupo
  CONSTRAINT FK_div_participante_es_miembro
    FOREIGN KEY (grupo_id, usuario_id)
    REFERENCES dbo.miembros_grupo (grupo_id, usuario_id),

  -- Al menos una modalidad indicada
  CONSTRAINT CK_div_gasto_alguna_regla
    CHECK (parte_importe IS NOT NULL OR parte_porcentaje IS NOT NULL)
);
GO

CREATE INDEX IX_divisiones_por_usuario ON dbo.divisiones_gasto (usuario_id);
GO

/* =========================================
   TABLA: liquidaciones
   Pago entre personas para saldar deudas dentro del grupo.
========================================= */
CREATE TABLE dbo.liquidaciones (
  id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
  grupo_id UNIQUEIDENTIFIER NOT NULL
    REFERENCES dbo.grupos(id) ON DELETE CASCADE,
  desde_usuario UNIQUEIDENTIFIER NOT NULL, -- quien paga
  hacia_usuario UNIQUEIDENTIFIER NOT NULL, -- quien cobra
  importe DECIMAL(12,2) NOT NULL CHECK (importe > 0),
  fecha_pago DATE NOT NULL,
  CONSTRAINT CK_liq_distintos_usuarios CHECK (desde_usuario <> hacia_usuario),

  -- Único compuesto para referenciar por (id, grupo_id)
  CONSTRAINT UQ_liquidaciones_id_grupo UNIQUE (id, grupo_id),

  -- Ambos deben ser miembros del grupo
  CONSTRAINT FK_liq_desde_es_miembro
    FOREIGN KEY (grupo_id, desde_usuario)
    REFERENCES dbo.miembros_grupo (grupo_id, usuario_id),
  CONSTRAINT FK_liq_hacia_es_miembro
    FOREIGN KEY (grupo_id, hacia_usuario)
    REFERENCES dbo.miembros_grupo (grupo_id, usuario_id)
);
GO

CREATE INDEX IX_liq_grupo_fecha ON dbo.liquidaciones (grupo_id, fecha_pago);
CREATE INDEX IX_liq_desde_hacia ON dbo.liquidaciones (desde_usuario, hacia_usuario);
GO

/* =========================================
   TABLA: ledger (historial inmutable)
   Libro mayor (doble partida). Cada fila: D=debito (debo), C=credito (me deben).
========================================= */
CREATE TABLE dbo.ledger (
  id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,

  grupo_id    UNIQUEIDENTIFIER NOT NULL,
  usuario_id UNIQUEIDENTIFIER NOT NULL,

  -- El usuario del movimiento debe ser miembro del grupo
  CONSTRAINT FK_ledger_usuario_es_miembro
    FOREIGN KEY (grupo_id, usuario_id)
    REFERENCES dbo.miembros_grupo (grupo_id, usuario_id),

  -- Origen polimórfico (una y solo una referencia válida)
  tipo_origen VARCHAR(20) NOT NULL
    CHECK (tipo_origen IN ('gasto','liquidacion')),

  gasto_id      UNIQUEIDENTIFIER NULL,
  liquidacion_id  UNIQUEIDENTIFIER NULL,

  CONSTRAINT CK_ledger_origen_exclusivo
  CHECK (
    (tipo_origen = 'gasto'          AND gasto_id IS NOT NULL      AND liquidacion_id IS NULL) OR
    (tipo_origen = 'liquidacion' AND liquidacion_id IS NOT NULL AND gasto_id IS NULL)
  ),

  -- El movimiento y su origen pertenecen al MISMO grupo
  CONSTRAINT FK_ledger_gasto
    FOREIGN KEY (gasto_id, grupo_id)
    REFERENCES dbo.gastos (id, grupo_id),

  CONSTRAINT FK_ledger_liquidacion
    FOREIGN KEY (liquidacion_id, grupo_id)
    REFERENCES dbo.liquidaciones (id, grupo_id),

  direccion CHAR(1) NOT NULL CHECK (direccion IN ('D','C')),
  importe    DECIMAL(12,2) NOT NULL CHECK (importe > 0),
  fecha DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

CREATE INDEX IX_ledger_grupo_usuario ON dbo.ledger (grupo_id, usuario_id);
CREATE INDEX IX_ledger_gasto         ON dbo.ledger (gasto_id, grupo_id) WHERE gasto_id IS NOT NULL;
CREATE INDEX IX_ledger_liquidacion   ON dbo.ledger (liquidacion_id, grupo_id) WHERE liquidacion_id IS NOT NULL;
CREATE INDEX IX_ledger_creado_en     ON dbo.ledger (fecha);
GO

/* =========================================
   TABLA: saldos_grupo (estado actual / cache)
   Estado acumulado por usuario en el grupo (lectura rápida).
   balance > 0 => me deben; balance < 0 => debo.
========================================= */
CREATE TABLE dbo.saldos_grupo (
  grupo_id    UNIQUEIDENTIFIER NOT NULL,
  usuario_id UNIQUEIDENTIFIER NOT NULL,
  balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  CONSTRAINT PK_saldos_grupo PRIMARY KEY (grupo_id, usuario_id),

  -- El saldo corresponde a un miembro del grupo
  CONSTRAINT FK_saldos_miembro
    FOREIGN KEY (grupo_id, usuario_id)
    REFERENCES dbo.miembros_grupo (grupo_id, usuario_id)
);
GO

CREATE INDEX IX_saldos_grupo_grupo ON dbo.saldos_grupo (grupo_id);
GO

/* =========================================
   TRIGGER: aplica movimientos del ledger a saldos_grupo (estado)
========================================= */
CREATE OR ALTER TRIGGER dbo.trg_ledger_actualiza_saldos
ON dbo.ledger
AFTER INSERT
AS
BEGIN
  SET NOCOUNT ON;

  MERGE dbo.saldos_grupo AS s
  USING (
    SELECT grupo_id, usuario_id,
           SUM(CASE WHEN direccion='C' THEN importe ELSE -importe END) AS delta
    FROM inserted
    GROUP BY grupo_id, usuario_id
  ) AS d
  ON s.grupo_id = d.grupo_id AND s.usuario_id = d.usuario_id
  WHEN MATCHED THEN
    UPDATE SET s.balance = s.balance + d.delta
  WHEN NOT MATCHED THEN
    INSERT (grupo_id, usuario_id, balance) VALUES (d.grupo_id, d.usuario_id, d.delta);
END;
GO

/* =========================================
   TRIGGER: inmutabilidad del ledger (no UPDATE/DELETE)
========================================= */
CREATE OR ALTER TRIGGER dbo.trg_ledger_inmutable
ON dbo.ledger
AFTER UPDATE, DELETE
AS
BEGIN
  RAISERROR('ledger es inmutable. Use asientos inversos para corregir.', 16, 1);
  ROLLBACK TRANSACTION;
END;
GO
