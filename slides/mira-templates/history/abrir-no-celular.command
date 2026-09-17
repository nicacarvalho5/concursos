#!/bin/bash
# __MIRA_TITULO__
# Sobe um servidor nesta pasta, na rede local, e abre a história pelo
# endereço da máquina, para o QR code da capa apontar para um endereço
# que o celular alcança. macOS: duplo clique no Finder. Linux: ./abrir-no-celular.command
cd "$(dirname "$0")" || exit 1
PORT=8080

IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}')
[ -z "$IP" ] && IP=localhost

echo
echo "  ============================================"
echo "   __MIRA_TITULO__"
echo "  ============================================"
echo
echo "   No celular ou tablet (mesma rede Wi-Fi), abra:"
echo
echo "      http://$IP:$PORT/index.html"
echo
echo "   Ou leia o QR code que aparece na capa."
echo "   Para parar: feche esta janela ou Ctrl+C."
echo

(sleep 1; open "http://$IP:$PORT/index.html" 2>/dev/null || xdg-open "http://$IP:$PORT/index.html" 2>/dev/null) &

if command -v python3 >/dev/null 2>&1; then
  python3 -m http.server "$PORT" --bind 0.0.0.0
elif command -v python >/dev/null 2>&1; then
  python -m http.server "$PORT" --bind 0.0.0.0
elif command -v node >/dev/null 2>&1; then
  node -e "const h=require('http'),f=require('fs'),p=require('path');const T={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.mp3':'audio/mpeg','.woff2':'font/woff2','.png':'image/png','.jpg':'image/jpeg'};h.createServer((q,r)=>{let u;try{u=decodeURIComponent(q.url.split('?')[0])}catch(e){r.writeHead(400);r.end('url invalida');return}if(u==='/')u='/index.html';const a=p.resolve(process.cwd(),'.'+u);if(!a.startsWith(process.cwd())){r.writeHead(403);r.end('fora da pasta');return}f.readFile(a,(e,d)=>{if(e){r.writeHead(404);r.end('nao achei');return}r.writeHead(200,{'Content-Type':T[p.extname(a)]||'application/octet-stream'});r.end(d)})}).listen($PORT,'0.0.0.0')"
else
  echo "  Não achei Python nem Node. Instale um deles e rode este arquivo de novo."
  read -n 1 -s -r -p "  Pressione qualquer tecla para fechar..."
fi
