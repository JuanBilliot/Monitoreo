import asyncio
from fastapi import FastAPI, Request, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from app.api.api_v1 import auth, metrics, servers
from app.database.database import engine, Base, create_tables
from app.utils.logger import logger
from pathlib import Path

settings = None

app = FastAPI()

# Middleware para logging
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"Incoming request: {request.method} {request.url}")
    response = await call_next(request)
    logger.info(f"Response status: {response.status_code}")
    return response

# Configurar cabeceras para evitar caché
@app.middleware("http")
async def add_no_cache_headers(request: Request, call_next):
    response = await call_next(request)
    if any(route in request.url.path for route in ['/static/', '.html', '.js', '.css']):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

# Montar los archivos estáticos
frontend_path = Path(__file__).parent.parent / "frontend"
app.mount("/static", StaticFiles(directory=str(frontend_path)), name="static")

# Configurar CORS - Permitir todas las credenciales y métodos necesarios
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Crear tablas en la base de datos
@app.on_event("startup")
def startup_event():
    create_tables()

# Incluir rutas API
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(metrics.router, prefix="/api/v1/metrics", tags=["metrics"])
app.include_router(servers.router, prefix="/api/v1/servers", tags=["servers"])

# Ruta para servir el index.html
@app.get("/")
async def root():
    logger.info("Root endpoint accessed")
    return FileResponse(str(frontend_path / "index.html"))

# Ruta para servir cualquier otro archivo del frontend
@app.get("/{path:path}")
async def serve_frontend(path: str):
    try:
        # Intenta servir archivos estáticos
        if path.startswith("static/"):
            # Extraer el nombre del archivo
            filename = path.replace("static/", "")
            return FileResponse(str(frontend_path / filename))
        else:
            # Servir el index.html para cualquier otra ruta
            return FileResponse(str(frontend_path / "index.html"))
    except Exception as e:
        logger.error(f"Error al servir {path}: {str(e)}")
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

@app.get("/health")
async def health_check():
    logger.info("Health check endpoint accessed")
    return {"status": "ok"}