"""Build a shareable source archive without credentials, user data or local backups."""
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parents[1]
DIRECTORIES = ('config','core','revision','texts','ai_marking','templates','static','data','docs','scripts','tests','.github')
FILES = ('README.md','requirements.txt','package.json','manage.py','.gitignore','.env.example','electragr.txt','electratrans.txt','herodgr.txt','herodtrans.txt')

def package():
    files=[ROOT / name for name in FILES]
    for directory in DIRECTORIES:
        files.extend(path for path in (ROOT/directory).rglob('*') if path.is_file() and '__pycache__' not in path.parts and path.suffix not in ('.pyc','.lock') and path.name!='.DS_Store')
    target=ROOT/'GreekLabs-2.0.zip'
    with ZipFile(target,'w',ZIP_DEFLATED) as archive:
        for path in sorted(files): archive.write(path,Path('GreekLabs-2.0')/path.relative_to(ROOT))
    print(f'Created {target.name}: {len(files)} files, {target.stat().st_size:,} bytes; no environment, database, or backup files.')

if __name__=='__main__': package()
