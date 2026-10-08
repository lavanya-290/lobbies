Add-Type -AssemblyName System.Drawing
$dir = "client\public\assets\furniture\quirky"
Get-ChildItem $dir -Filter *.png | ForEach-Object {
    $bmp = [System.Drawing.Bitmap]::FromFile($_.FullName)
    Write-Host "$($_.Name): $($bmp.Width) x $($bmp.Height)"
    $bmp.Dispose()
}
