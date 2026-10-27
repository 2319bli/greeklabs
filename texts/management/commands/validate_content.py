from django.core.management.base import BaseCommand, CommandError
from texts.catalog import load_catalog, read_json, validate, ContentError, COLLECTIONS

class Command(BaseCommand):
    help='Validate the installed catalogue, or a complete catalogue JSON file.'
    def add_arguments(self,parser): parser.add_argument('path',nargs='?')
    def handle(self,*args,**options):
        try:
            data=read_json(options['path']) if options['path'] else load_catalog()
            errors=validate(data)
            if errors: raise ContentError('\n'.join(errors))
        except ContentError as exc: raise CommandError(str(exc)) from exc
        self.stdout.write(self.style.SUCCESS('Valid catalogue: '+', '.join(f'{len(data[k])} {k}' for k in COLLECTIONS)))
