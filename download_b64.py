import requests
import base64
import sys

def get_base64_from_gdrive(file_id):
    url = f"https://drive.google.com/uc?export=download&id={file_id}"
    response = requests.get(url, allow_redirects=True)
    if response.status_code == 200:
        b64_string = base64.b64encode(response.content).decode('utf-8')
        # Infer type, mostly jpg for this use case
        return f"data:image/jpeg;base64,{b64_string}"
    else:
        print(f"Failed to download {file_id}. Status: {response.status_code}")
        return None

id_circle = "1jcS1JfpTACR8CVAYfEN1Zk3AEEHBKrrX"
id_bg = "1OLDEHUXexarGPuo86oqRXGYCdiis1Qx_"

circ_b64 = get_base64_from_gdrive(id_circle)
bg_b64 = get_base64_from_gdrive(id_bg)

if circ_b64:
    with open('circ_b64.txt', 'w') as f:
        f.write(circ_b64)
    print("Circle image converted successfully.")
if bg_b64:
    with open('bg_b64.txt', 'w') as f:
        f.write(bg_b64)
    print("Background image converted successfully.")
