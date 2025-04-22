import paramiko
from ..config import get_settings

settings = get_settings()

class SSHConnection:
    def __init__(self):
        self.client = paramiko.SSHClient()
        self.client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    def connect(self):
        try:
            self.client.connect(
                hostname=settings.SERVER_IP,
                username=settings.SERVER_USERNAME,
                password=settings.SERVER_PASSWORD
            )
            return True
        except Exception as e:
            print(f"Error al conectar: {str(e)}")
            return False
    
    def execute_command(self, command):
        try:
            stdin, stdout, stderr = self.client.exec_command(command)
            return stdout.read().decode(), stderr.read().decode()
        except Exception as e:
            print(f"Error al ejecutar comando: {str(e)}")
            return None, str(e)
    
    def close(self):
        self.client.close()