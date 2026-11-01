# One setup for a local copy. Installs Ollama if it is missing, pulls Gemma, and makes .env.
# Paste an ElevenLabs key into .env only if you want speech. The game still runs without it.
$ErrorActionPreference = "Continue"
Set-Location $PSScriptRoot

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Created .env. Open it and paste an ElevenLabs key and voice id if you want speech."
} else {
  Write-Host ".env is already here. Keys in that file are the ones the server will use."
}

$ollama = Get-Command ollama -ErrorAction SilentlyContinue
if (-not $ollama) {
  Write-Host "Installing Ollama..."
  winget install --id Ollama.Ollama -e --accept-package-agreements --accept-source-agreements
  $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
  $ollama = Get-Command ollama -ErrorAction SilentlyContinue
}

if (-not $ollama) {
  Write-Host "Ollama is not installed. Download it from https://ollama.com/download and run this script again."
  Write-Host "You can still play. The written riddles stay on screen, in the written order."
  exit 0
}

Write-Host "Pulling gemma3:4b. The first pull can take a few minutes."
& ollama pull gemma3:4b
if ($LASTEXITCODE -ne 0) {
  Write-Host "The Gemma pull did not finish. The game still runs from the written riddles."
  exit 0
}

Write-Host ""
Write-Host "Gemma is installed. Next:"
Write-Host "  1. Optional: paste ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID into .env"
Write-Host "  2. python server.py"
Write-Host "  3. Open http://127.0.0.1:8765/"
Write-Host "Settings on the intro says if voice or Gemma is missing. The room still plays."
