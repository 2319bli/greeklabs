import fcntl
import json
import os
import shutil
import tempfile
from datetime import datetime, timezone
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from texts.catalog import catalog_path, read_json, load_catalog, merge_catalog, ContentError

class Command(BaseCommand):
    help='Validate and merge content. Dry-run by default; --apply saves atomically with a backup.'
    def add_arguments(self,parser):
        parser.add_argument('path')
        parser.add_argument('--apply',action='store_true')
        parser.add_argument('--replace-existing',action='store_true')
    def handle(self,*args,**options):
        target=catalog_path()
        try:
            incoming=read_json(options['path'])
            # Serialise imports to avoid lost updates from concurrent CLI processes.
            with target.with_suffix('.lock').open('a') as lock:
                fcntl.flock(lock,fcntl.LOCK_EX)
                merged=merge_catalog(load_catalog(),incoming,options['replace_existing'])
                if not options['apply']:
                    self.stdout.write(self.style.SUCCESS('Valid import. No files changed. Add --apply to save.')); return
                backup=settings.BASE_DIR/'backups'/'content'
                backup.mkdir(parents=True,exist_ok=True)
                stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
                shutil.copy2(target,backup/f'catalog-{stamp}.json')
                name=None
                try:
                    with tempfile.NamedTemporaryFile('w',encoding='utf-8',dir=target.parent,delete=False) as f:
                        name=f.name;json.dump(merged,f,ensure_ascii=False,indent=2);f.write('\n');f.flush();os.fsync(f.fileno())
                    os.replace(name,target)
                finally:
                    if name and os.path.exists(name): os.unlink(name)
        except (ContentError,OSError) as exc: raise CommandError(str(exc)) from exc
        self.stdout.write(self.style.SUCCESS('Imported successfully. Previous catalogue backed up. Unrelated records retained.'))
