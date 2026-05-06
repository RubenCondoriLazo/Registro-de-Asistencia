# ============================================================
#  BACKEND PROFESIONAL - Sistema Biométrico IoT
#  Framework: FastAPI | Base de Datos: PostgreSQL
# ============================================================

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime

# ===================== CONFIGURACIÓN =====================
app = FastAPI(title="API Biométrico CEA")

# Configuración CORS (Permite que el HTML/JS se conecte a este servidor sin bloqueos de seguridad)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Credenciales de tu base de datos PostgreSQL
DB_CONFIG = {
    "dbname": "biometrico_db",
    "user": "postgres",
    "password": "tu_password_aqui", # Cambia esto por tu contraseña real
    "host": "localhost",
    "port": "5432"
}

# ===================== MODELOS DE DATOS (Pydantic) =====================
class AccesoRequest(BaseModel):
    huella_id: int

class RegistroRequest(BaseModel):
    huella_id: int
    accion: str

# ===================== FUNCIONES DE BASE DE DATOS =====================
def get_db_connection():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        return conn
    except Exception as e:
        print(f"Error conectando a BD: {e}")
        return None

# ===================== ENDPOINTS (RUTAS API) =====================

@app.post("/api/acceso")
async def verificar_acceso(req: AccesoRequest):
    """Recibe la petición del ESP32 cuando alguien pone el dedo."""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Error de Base de Datos")
    
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # 1. Buscar si el usuario existe y está activo
        cursor.execute(
            "SELECT nombre, estado FROM usuarios WHERE huella_id = %s", 
            (req.huella_id,)
        )
        usuario = cursor.fetchone()

        if usuario and usuario['estado'] == 'activo':
            # 2. Registrar el acceso como 'permitido'
            cursor.execute(
                "INSERT INTO registros_acceso (huella_id, estado_acceso) VALUES (%s, %s)",
                (req.huella_id, 'permitido')
            )
            conn.commit()
            
            return {
                "estado": "aprobado", 
                "nombre": usuario['nombre'],
                "mensaje": "Puerta Abierta"
            }
        else:
            # 3. Registrar intento fallido / denegado
            cursor.execute(
                "INSERT INTO registros_acceso (huella_id, estado_acceso) VALUES (%s, %s)",
                (req.huella_id, 'denegado')
            )
            conn.commit()
            
            return {"estado": "denegado", "nombre": "Desconocido"}
            
    finally:
        cursor.close()
        conn.close()


@app.post("/api/registrar")
async def registrar_nueva_huella(req: RegistroRequest):
    """Recibe la petición del ESP32 cuando se guarda una nueva huella en modo registro."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Crea un registro en blanco esperando que el administrador llene los datos en la web
        cursor.execute(
            "INSERT INTO usuarios (huella_id, nombre) VALUES (%s, 'Pendiente de Datos') ON CONFLICT DO NOTHING",
            (req.huella_id,)
        )
        conn.commit()
        return {"mensaje": "Huella sincronizada con BD exitosamente"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


@app.get("/api/reporte")
async def obtener_reporte(periodo: str = 'mensual'):
    """Envía los datos procesados al Frontend (Dashboard en JavaScript)."""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Consulta SQL avanzada: Une usuarios y cuenta sus asistencias, atrasos y faltas simuladas
        query = """
            SELECT 
                u.huella_id, 
                u.nombre, 
                u.ci,
                COUNT(r.id_registro) FILTER (WHERE r.estado_acceso = 'permitido') as asistencias,
                -- Simulación de lógica de negocio para atrasos y faltas basándose en registros
                COUNT(r.id_registro) FILTER (WHERE r.tipo_marca = 'atraso') as atrasos,
                COUNT(r.id_registro) FILTER (WHERE r.tipo_marca = 'falta') as faltas
            FROM usuarios u
            LEFT JOIN registros_acceso r ON u.huella_id = r.huella_id
            GROUP BY u.huella_id, u.nombre, u.ci
            ORDER BY u.nombre;
        """
        cursor.execute(query)
        resultados = cursor.fetchall()
        
        # FastAPI convierte automáticamente esta lista de diccionarios a JSON
        return resultados
    finally:
        cursor.close()
        conn.close()

# Iniciar servidor si se ejecuta el archivo directamente
if __name__ == "__main__":
    import uvicorn
    # Corre el servidor en el puerto 8000 en toda la red local (0.0.0.0)
    uvicorn.run(app, host="0.0.0.0", port=8000)
