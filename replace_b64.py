import re

with open('invitacion_bautizo/Index.html', 'r') as f:
    html = f.read()

with open('circ_b64.txt', 'r') as f:
    circ_b64 = f.read()

with open('bg_b64.txt', 'r') as f:
    bg_b64 = f.read()

# Replace Background
html = re.sub(
    r"url\('https://drive.google.com/uc\?export=view&id=1OLDEHUXexarGPuo86oqRXGYCdiis1Qx_'\)",
    f"url('{bg_b64}')",
    html
)

# Replace Circle image
html = html.replace(
    'src="https://drive.google.com/uc?export=view&id=1jcS1JfpTACR8CVAYfEN1Zk3AEEHBKrrX"',
    f'src="{circ_b64}"'
)

with open('invitacion_bautizo/Index.html', 'w') as f:
    f.write(html)
print("HTML updated with base64 images.")
