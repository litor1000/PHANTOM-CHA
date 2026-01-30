@echo off
echo ========================================
echo   TESTANDO BUILD DO PHANTOM CHAT
echo ========================================
echo.

echo [1/3] Verificando Node.js...
node --version
if %errorlevel% neq 0 (
    echo ERRO: Node.js nao encontrado!
    pause
    exit /b 1
)
echo OK!
echo.

echo [2/3] Verificando dependencias...
if not exist "node_modules" (
    echo Instalando dependencias...
    call npm install
)
echo OK!
echo.

echo [3/3] Testando compilacao...
echo Iniciando servidor de desenvolvimento...
echo.
echo ========================================
echo   Servidor rodando em http://localhost:3000
echo   Pressione Ctrl+C para parar
echo ========================================
echo.

call npm run dev
