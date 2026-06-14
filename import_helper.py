import urllib.request
import json

try:
    # 1. Login to get token
    login_url = 'http://localhost:8000/api/login'
    login_data = json.dumps({'username': 'admin', 'password': 'admin'}).encode('utf-8')
    req = urllib.request.Request(login_url, data=login_data, headers={'Content-Type': 'application/json'}, method='POST')
    with urllib.request.urlopen(req) as response:
        res_data = json.loads(response.read().decode())
        token = res_data['token']
    print("Logged in successfully. Token received.")

    # 2. Upload CSV
    import_url = 'http://localhost:8000/api/import'
    file_path = r'd:\apps\New folder\test_import.csv'
    boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': f'multipart/form-data; boundary={boundary}'
    }

    with open(file_path, 'rb') as f:
        file_content = f.read()

    # Construct multipart form-data body
    body = (
        f'--{boundary}\r\n'
        f'Content-Disposition: form-data; name="file"; filename="test_import.csv"\r\n'
        f'Content-Type: text/csv\r\n\r\n'
    ).encode('utf-8') + file_content + f'\r\n--{boundary}--\r\n'.encode('utf-8')

    req2 = urllib.request.Request(import_url, data=body, headers=headers, method='POST')
    with urllib.request.urlopen(req2) as response2:
        print("Import Response:", response2.read().decode())

except Exception as e:
    print("Error during import process:", e)
