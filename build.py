# Inlines style, data, Q&A and the core module into one page: public/index.html
import json, pathlib
r = pathlib.Path(__file__).parent
t = (r/'src/index.template.html').read_text()
t = t.replace('/*__CSS__*/', (r/'src/style.css').read_text())
t = t.replace('/*__DATA__*/', json.dumps(json.load(open(r/'data.json')), ensure_ascii=False).replace('</', r'<\/'))
t = t.replace('/*__QA__*/', json.dumps(json.load(open(r/'qa.json')), ensure_ascii=False).replace('</', r'<\/'))
t = t.replace('/*__CORE__*/', (r/'lib/core.cjs').read_text())
(r/'public/index.html').write_text(t)
print('built', len(t), 'bytes')
