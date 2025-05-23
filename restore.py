import os
import zipfile
import shutil

def list_backups():
    backup_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backups')
    return [f for f in os.listdir(backup_dir) if f.endswith('.zip')]

def restore_backup(backup_filename):
    # Directorio del proyecto
    project_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Directorio de backups
    backup_dir = os.path.join(project_dir, 'backups')
    backup_path = os.path.join(backup_dir, backup_filename)
    
    # Verificar que el archivo de backup existe
    if not os.path.exists(backup_path):
        print(f"Error: El archivo de backup {backup_filename} no existe.")
        return
    
    # Limpiar directorio actual (excepto backups y scripts)
    for item in os.listdir(project_dir):
        if item not in ['backups', 'backup.py', 'restore.py']:
            item_path = os.path.join(project_dir, item)
            if os.path.isdir(item_path):
                shutil.rmtree(item_path)
            else:
                os.unlink(item_path)
    
    # Extraer backup
    with zipfile.ZipFile(backup_path, 'r') as zip_ref:
        zip_ref.extractall(project_dir)
    
    print(f"Backup {backup_filename} restaurado exitosamente.")

def main():
    backups = list_backups()
    
    print("Backups disponibles:")
    for i, backup in enumerate(backups, 1):
        print(f"{i}. {backup}")
    
    try:
        selection = int(input("Ingrese el número del backup a restaurar: "))
        if 1 <= selection <= len(backups):
            restore_backup(backups[selection - 1])
        else:
            print("Selección inválida.")
    except ValueError:
        print("Por favor, ingrese un número válido.")

if __name__ == "__main__":
    main()
