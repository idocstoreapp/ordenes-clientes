# Script para configurar variables de entorno en Windows
# Ejecuta este script desde PowerShell en la raíz del proyecto

Write-Host "🔧 Configuración de Variables de Entorno" -ForegroundColor Cyan
Write-Host ""

# Verificar si existe .env.local
if (-not (Test-Path .env.local)) {
    Write-Host "⚠️  El archivo .env.local no existe. Creándolo..." -ForegroundColor Yellow
    New-Item -Path .env.local -ItemType File | Out-Null
}

# Leer el contenido actual
$currentContent = Get-Content .env.local -ErrorAction SilentlyContinue

# Verificar variables existentes
$hasSupabaseUrl = $currentContent | Select-String -Pattern "^PUBLIC_SUPABASE_URL=" -Quiet
$hasSupabaseAnonKey = $currentContent | Select-String -Pattern "^PUBLIC_SUPABASE_ANON_KEY=" -Quiet
$hasServiceRoleKey = $currentContent | Select-String -Pattern "^PUBLIC_SUPABASE_SERVICE_ROLE_KEY=" -Quiet
$hasBsaleTokens = $currentContent | Select-String -Pattern "^PUBLIC_BSALE_ACCESS_TOKENS=" -Quiet

Write-Host "📋 Estado actual de las variables:" -ForegroundColor Cyan
Write-Host "  PUBLIC_SUPABASE_URL: $(if ($hasSupabaseUrl) { '✅ Configurada' } else { '❌ Faltante' })"
Write-Host "  PUBLIC_SUPABASE_ANON_KEY: $(if ($hasSupabaseAnonKey) { '✅ Configurada' } else { '❌ Faltante' })"
Write-Host "  PUBLIC_SUPABASE_SERVICE_ROLE_KEY: $(if ($hasServiceRoleKey) { '✅ Configurada' } else { '❌ Faltante' })"
Write-Host "  PUBLIC_BSALE_ACCESS_TOKENS: $(if ($hasBsaleTokens) { '✅ Configurada' } else { '❌ Faltante' })"
Write-Host ""

# Función para agregar variable
function Add-EnvVariable {
    param(
        [string]$VariableName,
        [string]$Description
    )
    
    $exists = $currentContent | Select-String -Pattern "^$VariableName=" -Quiet
    
    if (-not $exists) {
        Write-Host "📝 $Description" -ForegroundColor Yellow
        Write-Host "   Ingresa el valor para $VariableName (o presiona Enter para omitir):" -ForegroundColor Gray
        $value = Read-Host
        
        if ($value -and $value.Trim() -ne "") {
            Add-Content -Path .env.local -Value "$VariableName=$value"
            Write-Host "   ✅ Variable agregada correctamente" -ForegroundColor Green
            $script:currentContent = Get-Content .env.local
        } else {
            Write-Host "   ⏭️  Variable omitida" -ForegroundColor Gray
        }
        Write-Host ""
    }
}

# Agregar variables faltantes
if (-not $hasSupabaseUrl) {
    Add-EnvVariable -VariableName "PUBLIC_SUPABASE_URL" -Description "URL de tu proyecto de Supabase (ej: https://xxxxx.supabase.co)"
}

if (-not $hasSupabaseAnonKey) {
    Add-EnvVariable -VariableName "PUBLIC_SUPABASE_ANON_KEY" -Description "Clave anónima de Supabase (anon public key, empieza con eyJ...)"
}

if (-not $hasServiceRoleKey) {
    Add-EnvVariable -VariableName "PUBLIC_SUPABASE_SERVICE_ROLE_KEY" -Description "Clave de servicio de Supabase (service_role key, empieza con eyJ..., muy larga)"
}

if (-not $hasBsaleTokens) {
    Add-EnvVariable -VariableName "PUBLIC_BSALE_ACCESS_TOKENS" -Description "Tokens de Bsale separados por coma (opcional)"
}

Write-Host ""
Write-Host "✅ Configuración completada!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Próximos pasos:" -ForegroundColor Cyan
Write-Host "  1. Verifica que todas las variables estén correctas en .env.local"
Write-Host "  2. Reinicia el servidor de desarrollo (Ctrl+C y luego npm run dev)"
Write-Host "  3. Intenta crear un usuario de tipo 'encargado'"
Write-Host ""
Write-Host "💡 Para obtener las claves de Supabase:" -ForegroundColor Yellow
Write-Host "   - Ve a https://app.supabase.com"
Write-Host "   - Settings → API"
Write-Host "   - Copia: Project URL, anon public key, service_role key"
Write-Host ""







