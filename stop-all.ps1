# AIPMS - Stop all node/next/nest development processes
Write-Host "Stopping all running development Node.js processes..." -ForegroundColor Yellow

$ports = @(3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009)

foreach ($port in $ports) {
    $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($conns) {
        foreach ($conn in $conns) {
            $procId = $conn.OwningProcess
            if ($procId -gt 0) {
                Write-Host "Killing process on port $port (PID: $procId)..." -ForegroundColor Red
                Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
            }
        }
    }
}

Write-Host "Cleaned up all AIPMS ports (3000-3009)." -ForegroundColor Green
