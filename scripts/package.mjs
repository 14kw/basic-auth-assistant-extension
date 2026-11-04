import { readFileSync, mkdirSync, mkdtempSync, cpSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
const manifest = JSON.parse(readFileSync(join(root, 'manifest.json')));
const files = ['manifest.json', 'background.js', 'core.js', 'popup.js', 'popup.html', 'popup.css', 'privacy.html', 'icons'];
const stage = mkdtempSync(join(tmpdir(), 'basic-auth-package-'));
const output = join(root, 'dist', `basic-auth-assistant-${manifest.version}.zip`);
try {
  mkdirSync(join(root, 'dist'), { recursive: true });
  for (const file of files) cpSync(join(root, file), join(stage, file), { recursive: true });
  rmSync(output, { force: true });
  if (process.platform === 'win32') {
    const quote = (value) => `'${value.replaceAll("'", "''")}'`;
    execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
      `$ErrorActionPreference = 'Stop'; Add-Type -AssemblyName System.IO.Compression.FileSystem; ` +
      `$stagePath = ${quote(stage)}; $archive = [System.IO.Compression.ZipFile]::Open(${quote(output)}, 'Create'); ` +
      `try { foreach ($filePath in [System.IO.Directory]::GetFiles($stagePath, '*', [System.IO.SearchOption]::AllDirectories)) { ` +
      `$entryName = $filePath.Substring($stagePath.Length + 1).Replace([char]92, [char]47); ` +
      `[void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $filePath, $entryName) } } finally { $archive.Dispose() }`], { cwd: stage });
  } else {
    execFileSync('zip', ['-q', '-r', output, ...files], { cwd: stage });
  }
  console.log(output);
} finally { rmSync(stage, { recursive: true, force: true }); }
