import os
import sys
import uvicorn
import importlib.util

# Agregar el directorio del proyecto al PYTHONPATH
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from app.main import app
    from config import get_settings
except ImportError:
    # Intentar importar usando importlib
    spec = importlib.util.spec_from_file_location("app.main", os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "app/main.py"))
    main = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(main)
    app = main.app

    # Importar settings
    spec = importlib.util.spec_from_file_location("config", os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "config.py"))
    config = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(config)
    settings = config.get_settings()

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )