import urllib.request
import json

try:
    url = "http://localhost:5000/api/v1/custom-test/taxonomy?subject=Mathematics"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        print(data)
except Exception as e:
    print("Error:", e)
