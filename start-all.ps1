# AIPMS - Launch all microservices, API gateway, and frontend
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Starting AIPMS Microservices & Frontend  " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$services = @(
    @{ Name = "Auth Service";      Port = 3001; Path = "services/auth-service";      Cmd = "npm run start:dev" },
    @{ Name = "Project Service";   Port = 3002; Path = "services/project-service";   Cmd = "npm run start:dev" },
    @{ Name = "Team Service";      Port = 3003; Path = "services/team-service";      Cmd = "npm run start:dev" },
    @{ Name = "Task Service";      Port = 3004; Path = "services/task-service";      Cmd = "npm run start:dev" },
    @{ Name = "Sprint Service";    Port = 3005; Path = "services/sprint-service";    Cmd = "npm run start:dev" },
    @{ Name = "Risk Service";      Port = 3006; Path = "services/risk-service";      Cmd = "npm run start:dev" },
    @{ Name = "Reporting Service"; Port = 3007; Path = "services/reporting-service"; Cmd = "npm run start:dev" },
    @{ Name = "AI Service";        Port = 3009; Path = "services/ai-service";        Cmd = "npm run start:dev" },
    @{ Name = "API Gateway";       Port = 3000; Path = "services/api-gateway";       Cmd = "npm run start:dev" },
    @{ Name = "Frontend (Next.js)";Port = 3008; Path = "frontend";                   Cmd = "npm run dev" }
)

foreach ($svc in $services) {
    Write-Host "Launching [$($svc.Name)] on port $($svc.Port)..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$host.ui.RawUI.WindowTitle = '$($svc.Name) (:$($svc.Port))'; cd '$($svc.Path)'; Write-Host 'Running $($svc.Name) on port $($svc.Port)...' -ForegroundColor Cyan; $($svc.Cmd)"
}

Write-Host "`nAll 10 services launched in separate windows!" -ForegroundColor Yellow
Write-Host "Frontend:    http://localhost:3008" -ForegroundColor White
Write-Host "API Gateway: http://localhost:3000" -ForegroundColor White
