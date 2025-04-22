import asyncio
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.api.api_v1 import auth, metrics, servers
from app.database.database import engine, Base, create_tables
from app.utils.logger import logger

settings = None

app = FastAPI()

# Middleware para logging
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"Incoming request: {request.method} {request.url}")
    response = await call_next(request)
    logger.info(f"Response status: {response.status_code}")
    return response

# Configurar CORS - Permitir todas las credenciales y métodos necesarios
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Crear tablas en la base de datos
@app.on_event("startup")
def startup_event():
    create_tables()

# Incluir rutas API
app.include_router(auth.router, prefix="/api/v1", tags=["auth"])
app.include_router(metrics.router, prefix="/api/v1", tags=["metrics"])
app.include_router(servers.router, prefix="/api/v1", tags=["servers"])

@app.get("/")
async def root():
    logger.info("Root endpoint accessed")
    return {"message": "Bienvenido a NetFlow"}

@app.get("/health")
async def health_check():
    logger.info("Health check endpoint accessed")
    return {"status": "ok"}