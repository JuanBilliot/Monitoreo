import platform
import subprocess
import psutil
from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

def format_bytes(bytes):
    """Convert bytes to human readable format."""
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if bytes < 1024:
            return f"{bytes:.2f} {unit}"
        bytes /= 1024

@app.route('/api/ping/<host>')
def ping_host(host):
    """Ping a host and return its status and latency."""
    try:
        param = '-n' if platform.system().lower() == 'windows' else '-c'
        command = ['ping', param, '1', host]
        output = subprocess.check_output(command).decode().strip()
        
        if 'time=' in output:
            latency = float(output.split('time=')[1].split()[0])
            return jsonify({'status': 'online', 'latency': latency})
        
        return jsonify({'status': 'offline', 'latency': 0})
    except:
        return jsonify({'status': 'offline', 'latency': 0})

@app.route('/api/metrics/<host>')
def get_metrics(host):
    """Get system metrics."""
    try:
        # CPU info
        cpu_info = {
            'usage': psutil.cpu_percent(),
            'cores': psutil.cpu_count(),
            'model': platform.processor()
        }

        # Memory info
        memory = psutil.virtual_memory()
        memory_info = {
            'total': memory.total,
            'used': memory.used,
            'free': memory.free,
            'percent': memory.percent,
            'formatted': {
                'total': format_bytes(memory.total),
                'used': format_bytes(memory.used),
                'free': format_bytes(memory.free)
            }
        }

        # Disk info
        disk = psutil.disk_usage('/')
        disk_info = {
            'total': disk.total,
            'used': disk.used,
            'free': disk.free,
            'percent': disk.percent,
            'formatted': {
                'total': format_bytes(disk.total),
                'used': format_bytes(disk.used),
                'free': format_bytes(disk.free)
            }
        }

        # Network info
        net = psutil.net_io_counters()
        network_info = {
            'bytes_sent': net.bytes_sent,
            'bytes_recv': net.bytes_recv,
            'packets_sent': net.packets_sent,
            'packets_recv': net.packets_recv,
            'dropin': net.dropin,
            'dropout': net.dropout,
            'formatted': {
                'bytes_sent': format_bytes(net.bytes_sent),
                'bytes_recv': format_bytes(net.bytes_recv)
            }
        }

        return jsonify({
            'cpu': cpu_info,
            'memory': memory_info,
            'disk': disk_info,
            'network': network_info
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001)
