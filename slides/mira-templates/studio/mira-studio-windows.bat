@echo off
rem Mira Studio: mesmo ciclo de vida comprovado da mesa tatica/Mira Remote.
rem O Node fica em primeiro plano e abre o Chrome somente depois de listen().
rem Fechar o Chrome nao derruba o servidor por engano; Ctrl+C encerra.
rem Mensagens sem acento de proposito: o console do Windows pode nao usar UTF-8.
setlocal
title Mira Studio
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 goto :semnode
if not exist "%~dp0mira\mira-studio-server.cjs" goto :semservidor

echo.
echo   Subindo o Mira Studio...
echo   O Chrome abrira somente depois que o servidor estiver pronto.
echo   Esta janela mantem o servidor vivo. Pressione Ctrl+C para encerrar.
echo.
node "%~dp0mira\mira-studio-server.cjs"
set "MIRA_EXIT=%ERRORLEVEL%"

echo.
echo   O servidor parou.
if not "%MIRA_EXIT%"=="0" echo   Consulte o log em: %~dp0mira\mira-studio.log
pause
exit /b %MIRA_EXIT%

:semnode
echo.
echo   Node.js nao encontrado. Instale Node.js 18.20.2 ou superior e tente novamente.
echo   O Chrome nao sera aberto porque o servidor local nao pode iniciar.
echo   Download: https://nodejs.org/
echo.
pause
exit /b 1

:semservidor
echo.
echo   mira\mira-studio-server.cjs nao encontrado.
echo   Atualize os templates do Mira antes de tentar novamente.
echo.
pause
exit /b 1
