@echo off
cls
echo ========================================
echo   REINICIANDO SERVIDOR - PHANTOM CHAT
echo ========================================
echo.

echo [INFO] Parando processos anteriores...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo [INFO] Iniciando servidor com novas configuracoes...
echo.
echo ========================================
echo   Servidor rodando em http://localhost:3000
echo   Pressione Ctrl+C para parar
echo ========================================
echo.

npm run dev
