# Guía para Verificar y Configurar SQL Server

## Problema
El backend no puede conectarse a SQL Server en `localhost:52534`

## Solución

### Paso 1: Verificar si SQL Server está corriendo

1. Abre **SQL Server Configuration Manager** (busca en el menú de inicio)
2. Ve a **SQL Server Services**
3. Verifica que **SQL Server (SQL)** o **SQL Server (MSSQLSERVER)** esté en estado **Running**

Si no está corriendo:
- Click derecho → **Start**

### Paso 2: Verificar el puerto de SQL Server

1. En **SQL Server Configuration Manager**, ve a:
   - **SQL Server Network Configuration** → **Protocols for SQL** (o tu instancia)
2. Verifica que **TCP/IP** esté **Enabled**
3. Click derecho en **TCP/IP** → **Properties**
4. Ve a la pestaña **IP Addresses**
5. Busca **IPAll** al final
6. Verifica el puerto en **TCP Dynamic Ports** o **TCP Port**

### Paso 3: Configurar el puerto (si es necesario)

Si el puerto es diferente a 52534, tienes dos opciones:

**Opción A: Cambiar el puerto en el backend**
Crea un archivo `.env` en la carpeta `backend/`:
```
DB_PORT=1433
```
(Reemplaza 1433 con el puerto que muestra SQL Server)

**Opción B: Cambiar el puerto de SQL Server**
1. En **TCP/IP Properties**, pestaña **IP Addresses**
2. En **IPAll**, establece **TCP Port** a `52534`
3. Reinicia SQL Server

### Paso 4: Habilitar TCP/IP (si está deshabilitado)

1. En **SQL Server Network Configuration** → **Protocols for SQL**
2. Si **TCP/IP** está **Disabled**, click derecho → **Enable**
3. Reinicia SQL Server

### Paso 5: Verificar conexión

Ejecuta este comando para probar la conexión:
```bash
cd backend
npm run test-db
```

O manualmente:
```bash
sqlcmd -S localhost,52534 -E
```

Si funciona, verás el prompt `1>` de SQL Server.

## Puertos comunes de SQL Server

- **1433**: Puerto por defecto de SQL Server
- **52534**: Puerto personalizado (puede que no esté configurado)
- **Dynamic Port**: SQL Server asigna un puerto aleatorio

## Nota sobre Windows Authentication

El código está configurado para usar **Windows Authentication** por defecto (no requiere usuario/contraseña). Esto debería funcionar si estás en la misma máquina.

