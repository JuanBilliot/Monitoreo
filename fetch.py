import requests
import pandas as pd
from requests.auth import HTTPBasicAuth
import os
from dotenv import load_dotenv

# Cargar las variables de entorno desde .env
load_dotenv()

# Configuración desde variables de entorno
API_URL = os.getenv("API_URL", "https://mesadeayuda.sommiercenter.com/api/v1/incidents")
USER = os.getenv("API_USER", "getuser")
PASSWORD = os.getenv("API_PASSWORD", "1I7O0QskDjQlmozI2TMdD96g")

# Nombre del archivo Excel procesado
PROCESSED_EXCEL_FILE = "tickets_exportados.xlsx"

def fetch_tickets_by_ids(api_url, user, password, ids):
    """
    Obtiene tickets específicos usando sus IDs enviando 'ids[]' como múltiples parámetros GET.
    """
    all_tickets = []
    try:
        print(f"Obteniendo tickets con IDs: {ids}")
        
        # Enviar 'ids[]' como múltiples parámetros
        params = [('ids[]', id_) for id_ in ids]
        
        headers = {
            "Accept": "application/json"  # Indicar que esperamos una respuesta en JSON
        }
        
        response = requests.get(api_url, auth=HTTPBasicAuth(user, password), params=params, headers=headers)
        
        print(f"URL Solicitada: {response.url}")
        print(f"Código de Estado: {response.status_code}")
        
        if response.status_code == 428:
            print(f"Error 428 recibido. Detalles de la respuesta:")
            print(f"Encabezados de respuesta: {response.headers}")
            print(f"Cuerpo de la respuesta: {response.text}")
            response.raise_for_status()
        
        response.raise_for_status()
        data = response.json()
        tickets = data.get("data", [])
        all_tickets.extend(tickets)
        print(f"Obtenidos {len(tickets)} tickets.")
    except requests.exceptions.HTTPError as http_err:
        print(f"HTTP error occurred: {http_err}")
        print(f"Detalles de la respuesta: {response.text}")
    except Exception as err:
        print(f"Error ocurrió: {err}")
    return all_tickets

def process_tickets(tickets):
    """
    Procesa la lista de tickets para extraer y transformar los datos necesarios.
    """
    if not tickets:
        print("No hay tickets para procesar.")
        return pd.DataFrame()

    # Crear un DataFrame a partir de los tickets
    df = pd.DataFrame(tickets)
    print(f"DataFrame creado con {len(df)} filas.")

    # Verificar las columnas disponibles
    print(f"Columnas originales en el DataFrame: {df.columns.tolist()}")

    # Definir los mapeos de columnas según la estructura de la API
    columnas_necesarias_adjusted = {
        "id": "Ticket",
        "title": "Título",
        "category_id": "Categoría",
        "description": "Descripción",
        "priority_id": "Prioridad",
        "agent": "Agente",
        "creator_id": "Creador",
        "assigned_id": "Asignado",
        "assigned_group_id": "Grupo Asignado",
        "date_ocurred": "Fecha Ocurrida",
        "source_id": "Fuente",
        "status": "Estado",
        "type_id": "Tipo",
        "Fecha de creacion": "Fecha de Creación",
        "last_update": "Última Actualización",
        "process_id": "Proceso",
        "solved_at": "Resuelto en",
        "Fecha de cierre": "Fecha de Cierre",
        "closed_reason": "Razón de Cierre",
        "data_cleaned": "Datos Limpios",
        "location_id": "Ubicación",
        "pretty_id": "ID Legible",
        "rating": "Calificación",
        "attachments": "Adjuntos",
        "SLA de resolucion": "SLA de Resolución",
        "Primera Respuesta": "Primera Respuesta",
        "custom_fields": "Campos Personalizados"
    }

    # Verificar que las columnas necesarias existan
    missing_columns = [orig for orig in columnas_necesarias_adjusted.keys() if orig not in df.columns]
    if missing_columns:
        print(f"Faltan las siguientes columnas en los datos: {missing_columns}")
        # Asignar valores por defecto
        for col in missing_columns:
            df[col] = None
        print("Se han añadido columnas faltantes con valores por defecto.")

    # Extraer y renombrar las columnas necesarias
    try:
        df = df[list(columnas_necesarias_adjusted.keys())].rename(columns=columnas_necesarias_adjusted)
        print("Columnas extraídas y renombradas exitosamente.")
    except KeyError as e:
        print(f"Error al renombrar columnas: {e}")
        return pd.DataFrame()

    # Convertir 'Fecha de Creación' y 'Fecha de Cierre' a datetime
    df['Fecha de Creación'] = pd.to_datetime(df['Fecha de Creación'], errors='coerce')
    df['Fecha de Cierre'] = pd.to_datetime(df['Fecha de Cierre'], errors='coerce')
    print("Conversión de fechas realizada.")

    # Calcular 'Demora' como la diferencia en días
    df['Demora'] = (df['Fecha de Cierre'] - df['Fecha de Creación']).dt.days
    print("Columna 'Demora' calculada.")

    # Añadir una columna vacía para 'Usuario'
    df['Usuario'] = ""
    print("Columna 'Usuario' añadida.")

    # Reordenar las columnas según los datos que necesitas
    columnas_finales = [
        "Ticket",
        "Título",
        "Descripción",
        "Agente",
        "Estado",
        "Fecha de Creación",
        "Fecha de Cierre",
        "Demora",
        "Usuario"
    ]
    # Asegurarse de que todas las columnas finales existan
    columnas_finales = [col for col in columnas_finales if col in df.columns]
    df = df[columnas_finales]
    print(f"Columnas reordenadas: {df.columns.tolist()}")

    return df

def export_to_excel(df, output_path):
    """
    Exporta el DataFrame procesado a un archivo Excel.
    """
    try:
        df.to_excel(output_path, index=False)
        print(f"Datos procesados y exportados exitosamente a: {output_path}")
    except Exception as e:
        print(f"Error al exportar a Excel: {e}")

def fetch_tickets():
    """
    Función principal que ejecuta el proceso de obtención, procesamiento y exportación de tickets.
    """
    try:
        # Reemplaza estos IDs con los IDs válidos obtenidos del archivo Excel anterior
        ids = [456, 789]  # Ejemplo: Reemplaza con IDs válidos reales

        if not ids:
            print("No hay IDs proporcionados para obtener tickets.")
            return

        # Intentar obtener tickets usando 'ids[]' como múltiples parámetros GET
        tickets = fetch_tickets_by_ids(API_URL, USER, PASSWORD, ids)

        # Si no se obtuvieron tickets, puedes intentar otro método si es necesario
        if not tickets:
            print("No se obtuvieron tickets usando el método de múltiples parámetros 'ids[]'.")
            # Puedes implementar otro método si sabes cómo la API lo espera

        # Procesar los tickets
        df = process_tickets(tickets)

        if df.empty:
            print("No hay datos para exportar.")
            return

        # Exportar a Excel
        export_to_excel(df, PROCESSED_EXCEL_FILE)

    except Exception as e:
        print(f"Error en el proceso de fetch_tickets: {e}")

if __name__ == "__main__":
    fetch_tickets()
