import json
import os
from http.server import HTTPServer, SimpleHTTPRequestHandler
import urllib.parse

# Файл для хранения пользователей
USERS_FILE = "users.json"

# Загрузка пользователей из файла
def load_users():
    if os.path.exists(USERS_FILE):
        try:
            with open(USERS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return []
    return []

# Сохранение пользователей в файл
def save_users(users):
    with open(USERS_FILE, 'w', encoding='utf-8') as f:
        json.dump(users, f, ensure_ascii=False, indent=2)
    print(f"💾 Сохранено {len(users)} пользователей")

class CustomHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        # Обработка API запросов
        if self.path == '/api/users':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            users = load_users()
            self.wfile.write(json.dumps(users).encode())
            return
        
        # Обычные файлы
        return super().do_GET()
    
    def do_POST(self):
        if self.path == '/api/users':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode())
            
            users = load_users()
            
            # Добавление нового пользователя
            if 'action' in data and data['action'] == 'add':
                new_user = data['user']
                # Проверка на дубликат
                if not any(u.get('email') == new_user.get('email') for u in users):
                    users.append(new_user)
                    save_users(users)
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({'status': 'ok', 'users': users}).encode())
                    return
            
            # Обновление всей базы
            elif 'action' in data and data['action'] == 'update':
                users = data['users']
                save_users(users)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'ok', 'users': users}).encode())
                return
            
            # Очистка базы
            elif 'action' in data and data['action'] == 'clear':
                save_users([])
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'ok', 'users': []}).encode())
                return
        
        # Если не API - обычная обработка
        return super().do_POST()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

def run_server(port=8000):
    server_address = ('', port)
    httpd = HTTPServer(server_address, CustomHandler)
    print(f"🚀 Сервер запущен на http://localhost:{port}")
    print(f"📁 База пользователей: {USERS_FILE}")
    print("Нажмите Ctrl+C для остановки")
    httpd.serve_forever()

if __name__ == '__main__':
    run_server()