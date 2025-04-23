import logging
from datetime import datetime
from config import get_settings

settings = get_settings()

def setup_logging():
    # Configurar el logger
    logger = logging.getLogger("netflow")
    logger.setLevel(logging.INFO)
    
    # Formato del log
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Handler para archivo
    file_handler = logging.FileHandler('netflow.log')
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)
    
    # Handler para consola
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    return logger

# Logger global
logger = setup_logging()