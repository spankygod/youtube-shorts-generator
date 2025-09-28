import requests, os, sys
# Test HeadTTS synthesize via Python
# 2) Real synthesis
r = requests.post(
    'http://127.0.0.1:8882/v1/synthesize',
    json={'input':'Hello world','voice':'am_fenrir','language':'en-us','speed':1,'audioEncoding':'wav'}
)
if r.status_code != 200:
    print('❌ Failed:', r.status_code, r.text)
    sys.exit(1)

out = os.path.join('temporary_files','test','hello.wav')
os.makedirs(os.path.dirname(out), exist_ok=True)
with open(out, 'wb') as f:
    f.write(r.content)
print('✅ Wrote', out, '(', len(r.content), 'bytes )')