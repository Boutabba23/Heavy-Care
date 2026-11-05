Add-Type -AssemblyName System.Drawing

# Run from anywhere: resolve paths relative to this script and the repo root
$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$src = [System.Drawing.Bitmap]::FromFile((Join-Path $repoRoot "logo.png"))

# Crop the 118x118 content region with a little margin
$cx = 124; $cy = 272; $cw = 122; $ch = 122
$crop = $src.Clone([System.Drawing.Rectangle]::new($cx, $cy, $cw, $ch), $src.PixelFormat)
$src.Dispose()

# Flood-fill transparency from the borders (only outer white becomes transparent;
# white pixels inside the emblem stay opaque)
$stack = New-Object System.Collections.Stack
$visited = New-Object 'System.Boolean[,]' $ch, $cw
for ($x = 0; $x -lt $cw; $x++) {
  $stack.Push(@($x, 0)); $stack.Push(@($x, ($ch - 1)))
}
for ($y = 0; $y -lt $ch; $y++) {
  $stack.Push(@(0, $y)); $stack.Push(@(($cw - 1), $y))
}
while ($stack.Count -gt 0) {
  $pt = $stack.Pop()
  $x = $pt[0]; $y = $pt[1]
  if ($x -lt 0 -or $y -lt 0 -or $x -ge $cw -or $y -ge $ch) { continue }
  if ($visited[$y, $x]) { continue }
  $visited[$y, $x] = $true
  $p = $crop.GetPixel($x, $y)
  if ($p.R -gt 240 -and $p.G -gt 240 -and $p.B -gt 240) {
    $crop.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, $p.R, $p.G, $p.B))
    $stack.Push(@($x + 1, $y)); $stack.Push(@($x - 1, $y))
    $stack.Push(@($x, $y + 1)); $stack.Push(@($x, $y - 1))
  }
}

# Compose the final 256x256 icon with ~12% padding, transparent background
$size = 256
$icon = New-Object System.Drawing.Bitmap $size, $size
$g = [System.Drawing.Graphics]::FromImage($icon)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.Clear([System.Drawing.Color]::Transparent)
$content = [int]($size * 0.88)
$off = [int](($size - $content) / 2)
$g.DrawImage($crop, $off, $off, $content, $content)
$g.Dispose()

# Layer sizes that Windows will pick from when scaling down fast
$sizes = @(256, 128, 64, 48, 32, 16)
$out256 = Join-Path $PSScriptRoot "icon.png"
$icon.Save($out256, [System.Drawing.Imaging.ImageFormat]::Png)
$icon.Dispose()
$crop.Dispose()
Write-Output "Saved $out256"
