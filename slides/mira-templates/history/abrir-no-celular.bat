@echo off
rem ============================================================
rem  __MIRA_TITULO__
rem  Sobe um servidor nesta pasta, na rede local, e abre a historia
rem  pelo endereco da maquina (nao por localhost), para que o QR code
rem  da capa aponte para um endereco que o celular alcanca.
rem
rem  Duplo clique neste arquivo. Para parar, feche a janela.
rem  Celular e tablet precisam estar na MESMA rede Wi-Fi.
rem  Se o Windows perguntar sobre o firewall, permita em rede privada.
rem ============================================================

setlocal
cd /d "%~dp0"
set "PORT=8080"

rem IP da rede: ignora loopback, link-local e adaptadores virtuais (VPN, Hyper-V, VirtualBox, VMware)
for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' -and $_.InterfaceAlias -notmatch 'vEthernet|VirtualBox|VMware|Loopback|Bluetooth|VPN|Tailscale|ZeroTier|Hamachi' } | Sort-Object { if ($_.InterfaceAlias -match 'Wi-Fi|Ethernet') { 0 } else { 1 } } | Select-Object -First 1).IPAddress"`) do set "IP=%%i"
if not defined IP set "IP=localhost"

echo.
echo   ============================================
echo    __MIRA_TITULO__
echo   ============================================
echo.
echo    No celular ou tablet (mesma rede Wi-Fi), abra:
echo.
echo       http://%IP%:%PORT%/index.html
echo.
echo    Ou leia o QR code que aparece na capa.
echo    Para parar: feche esta janela ou Ctrl+C.
echo.

start "" "http://%IP%:%PORT%/index.html"

where python >nul 2>nul
if not errorlevel 1 (
    python -m http.server %PORT% --bind 0.0.0.0
    goto :fim
)
where py >nul 2>nul
if not errorlevel 1 (
    py -3 -m http.server %PORT% --bind 0.0.0.0
    goto :fim
)
where node >nul 2>nul
if not errorlevel 1 (
    node -e "const h=require('http'),f=require('fs'),p=require('path');const T={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.mp3':'audio/mpeg','.woff2':'font/woff2','.png':'image/png','.jpg':'image/jpeg'};h.createServer((q,r)=>{let u;try{u=decodeURIComponent(q.url.split('?')[0])}catch(e){r.writeHead(400);r.end('url invalida');return}if(u==='/')u='/index.html';const a=p.resolve(process.cwd(),'.'+u);if(!a.startsWith(process.cwd())){r.writeHead(403);r.end('fora da pasta');return}f.readFile(a,(e,d)=>{if(e){r.writeHead(404);r.end('nao achei');return}r.writeHead(200,{'Content-Type':T[p.extname(a)]||'application/octet-stream'});r.end(d)})}).listen(%PORT%,'0.0.0.0')"
    goto :fim
)
echo   Nao achei Python nem Node no PATH. Instale um deles e rode este arquivo de novo.
pause

:fim
endlocal
