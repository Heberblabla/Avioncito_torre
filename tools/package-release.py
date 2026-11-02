"""Exporta el juego con index.html en la raíz, listo para GitHub Pages."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import argparse

root = Path(__file__).resolve().parents[1]
public = root / 'dist' if (root / 'dist/index.html').exists() else root
parser = argparse.ArgumentParser()
parser.add_argument('--output', default=str(root.parent / 'AVIONCITO.zip'))
args = parser.parse_args()
out = Path(args.output).resolve()
out.parent.mkdir(parents=True, exist_ok=True)
with ZipFile(out, 'w', ZIP_DEFLATED, compresslevel=9) as archive:
    for name in ['index.html', 'style.css', '.nojekyll', 'assets', 'js', 'qa.html', 'qa.js']:
        source = public / name
        files = sorted(source.rglob('*')) if source.is_dir() else [source]
        for path in files:
            if path.is_file():
                archive.write(path, 'AVIONCITO/' + str(path.relative_to(public)))
    for name in ['README.md', 'PRUEBAS.md', 'package.json', '.gitignore']:
        archive.write(root / name, 'AVIONCITO/' + name)
    for path in sorted((root / 'tests').rglob('*.js')):
        text = path.read_text().replace('../dist/js/', '../js/')
        archive.writestr('AVIONCITO/' + str(path.relative_to(root)), text)
    for path in sorted((root / 'tools').glob('*.py')):
        text = path.read_text().replace("'assets/av-pixel.woff'", "'assets/av-pixel.woff'")
        archive.writestr('AVIONCITO/tools/' + path.name, text)
print(f'{out}: {out.stat().st_size:,} bytes')
