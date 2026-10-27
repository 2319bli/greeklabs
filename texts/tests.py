import copy
import hashlib
import io
import json
import re
import tempfile
from pathlib import Path
from urllib.parse import urljoin
from django.conf import settings
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import SimpleTestCase, override_settings
from texts.catalog import load_catalog, validate, merge_catalog, read_json, ContentError
from scripts.migrate_legacy_content import split_sections

class CatalogueTests(SimpleTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass();cls.catalog=load_catalog()

    def test_catalogue_and_all_35_original_sections(self):
        self.assertEqual(validate(self.catalog),[])
        self.assertEqual(len(self.catalog['sections']),35)
        self.assertEqual(len(self.catalog['texts']),4)
        for text_id,gfile,efile in [('electra','electragr.txt','electratrans.txt'),('herodotus','herodgr.txt','herodtrans.txt')]:
            greek=split_sections((settings.BASE_DIR/gfile).read_text())
            english=split_sections((settings.BASE_DIR/efile).read_text())
            for section in [s for s in self.catalog['sections'] if s['text_id']==text_id]:
                number=str(section['number'])
                self.assertEqual(section['greek'],greek[number]['body'])
                self.assertEqual(section['translation'],english[number]['body'])
                self.assertTrue(section['translation'])

    def test_source_files_unchanged(self):
        manifest=json.loads((settings.BASE_DIR/'data/source-checksums.json').read_text())
        for path,digest in manifest.items():
            self.assertEqual(hashlib.sha256((settings.BASE_DIR/path).read_bytes()).hexdigest(),digest,path)

    def test_alignment_and_verse_ranges(self):
        for s in self.catalog['sections']:
            if s['text_id']=='electra':
                self.assertEqual(s['alignment'],'section')
                self.assertEqual([l['number'] for l in s['lines']],list(range(s['line_start'],s['line_end']+1)))
            else:
                self.assertEqual(s['alignment'],'subsection')
                self.assertTrue(all(u['greek'] and u['translation'] for u in s['units']))
        s=next(s for s in self.catalog['sections'] if s['id']=='herodotus-209')
        self.assertEqual(len(s['units']),5)
        self.assertIn('While you have heard',s['units'][1]['translation'])

    def test_missing_and_duplicate_identifiers(self):
        c=copy.deepcopy(self.catalog);c['unseen'].append(copy.deepcopy(c['unseen'][0]))
        self.assertIn('duplicate identifier','\n'.join(validate(c)))
        c=copy.deepcopy(self.catalog);del c['texts'][0]['title']
        self.assertIn('title: required','\n'.join(validate(c)))

    def test_invalid_references_and_line_numbers(self):
        c=copy.deepcopy(self.catalog);c['sections'][0]['text_id']='missing'
        self.assertIn('unknown set text','\n'.join(validate(c)))
        c=copy.deepcopy(self.catalog);c['sections'][0]['lines'][1]['number']=1
        self.assertIn('consecutive and increasing','\n'.join(validate(c)))
        c=copy.deepcopy(self.catalog);c['sections'][0]['units'][0].update(line_start=20,line_end=21)
        self.assertIn('outside section','\n'.join(validate(c)))
        c=copy.deepcopy(self.catalog);c['unseen'][0]['topic_ids']=['unknown']
        self.assertIn('unknown grammar topic','\n'.join(validate(c)))

    def test_malformed_fields_report_errors_instead_of_crashing(self):
        for group,field,values in [('sections','text_id',[[],{},None,8]),('sections','units',[{},None,'x']),('sections','lines',[{},None,'x']),('unseen','number',[True,-1,'2']),('grammar','examples',['x',{}]),('grammar','related_ids',[True,{}]),('annotations','text_id',[[]])]:
            for value in values:
                c=copy.deepcopy(self.catalog)
                if not c[group]:c[group]=[{'id':'invalid','status':'draft'}]
                c[group][0][field]=value
                self.assertTrue(validate(c),(group,field,value))

    def test_annotations_and_questions_reference_correct_text(self):
        c=copy.deepcopy(self.catalog)
        c['annotations']=[dict(id='test-note',status='sample',text_id='herodotus',section_id='electra-1',reference='1',quote='fixture',technique='fixture',effect='fixture',context='fixture')]
        self.assertIn('wrong set text','\n'.join(validate(c)))
        c['annotations'][0]['text_id']='electra';c['annotations'][0]['unit_id']='missing'
        self.assertIn('unknown reading unit','\n'.join(validate(c)))
        c['questions']=[dict(id='test-question',title='Fixture',status='sample',text_id='electra',reference='1',question='Fixture',section_ids=['herodotus-207'])]
        self.assertIn('wrong set text','\n'.join(validate(c)))

    def test_published_requires_real_content(self):
        c=copy.deepcopy(self.catalog);c['unseen'][0]['status']='published'
        errors='\n'.join(validate(c));self.assertIn('greek',errors);self.assertIn('translation',errors)

    def test_merge_does_not_overwrite_unrelated_content(self):
        patch={'schema_version':1,'unseen':[dict(self.catalog['unseen'][0],id='new-unseen',number=3)]}
        merged=merge_catalog(self.catalog,patch)
        self.assertEqual(merged['sections'],self.catalog['sections'])
        self.assertEqual(merged['unseen'][:2],self.catalog['unseen'])
        self.assertEqual(len(merged['unseen']),3)
        self.assertEqual(len(self.catalog['unseen']),2)
        with self.assertRaises(ContentError):merge_catalog(self.catalog,{'schema_version':1,'unseen':[self.catalog['unseen'][0]]})
        with self.assertRaises(ContentError):merge_catalog(self.catalog,{'schema_version':1,'unseen':[patch['unseen'][0]]*2})

    def test_400_exercises_validate_without_frontend_changes(self):
        patch={'schema_version':1,'unseen':[],'compositions':[]}
        for group in ('unseen','compositions'):
            for n in range(3,203):patch[group].append(dict(self.catalog[group][0],id=f'fixture-{group}-{n}',number=n))
        merged=merge_catalog(self.catalog,patch)
        self.assertEqual(validate(merged),[])
        self.assertEqual(len(merged['unseen']),202)
        self.assertEqual(len(merged['compositions']),202)

    def test_import_is_dry_run_and_apply_is_backed_up(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);target=root/'catalog.json';target.write_text(json.dumps(self.catalog))
            patch=root/'patch.json';patch.write_text(json.dumps({'schema_version':1,'grammar':[dict(self.catalog['grammar'][0],id='new-topic')]}))
            original=target.read_bytes()
            with override_settings(CONTENT_CATALOG=target,BASE_DIR=root):
                call_command('import_content',str(patch),stdout=io.StringIO())
                self.assertEqual(target.read_bytes(),original)
                call_command('import_content',str(patch),apply=True,stdout=io.StringIO())
                self.assertEqual(len(load_catalog()['grammar']),3)
                backups=list((root/'backups/content').glob('*.json'));self.assertEqual(len(backups),1)
                self.assertEqual(backups[0].read_bytes(),original)
                after=target.read_bytes()
                with self.assertRaises(CommandError):call_command('import_content',str(patch),apply=True,stdout=io.StringIO())
                self.assertEqual(target.read_bytes(),after)
                call_command('import_content',str(patch),apply=True,replace_existing=True,stdout=io.StringIO())
                self.assertEqual(len(load_catalog()['grammar']),3)

    def test_duplicate_json_properties_are_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            path=Path(temp)/'bad.json';path.write_text('{"schema_version":1,"schema_version":1}')
            with self.assertRaises(ContentError):read_json(path)

    def test_web_routes_and_retired_markers(self):
        self.assertRedirects(self.client.get('/'),'/revision/')
        self.assertContains(self.client.get('/revision/'),'GreekLabs')
        self.assertEqual(self.client.get('/api/catalog/').status_code,200)
        self.assertEqual(len(self.client.get('/api/texts/').json()),4)
        self.assertEqual(self.client.get('/api/texts/odyssey-22/').json()['sections'],[])
        self.assertEqual(self.client.get('/api/texts/missing/').status_code,404)
        for path in ['/api/mark-translation','/api/mark-essay']:
            self.assertEqual(self.client.post(path,data='{}',content_type='application/json').status_code,404)
        self.assertEqual(self.client.post('/api/catalog/').status_code,405)

    def test_bad_catalogue_yields_safe_error(self):
        with tempfile.TemporaryDirectory() as temp:
            path=Path(temp)/'bad.json';path.write_text('not json')
            with override_settings(CONTENT_CATALOG=path):
                response=self.client.get('/api/catalog/')
                self.assertEqual(response.status_code,503)
                self.assertNotIn(temp,response.content.decode())

    def test_pages_export_preserves_content_and_uses_project_relative_urls(self):
        with tempfile.TemporaryDirectory() as temp:
            target = Path(temp) / 'greeklabs'
            call_command('export_pages', output=target, stdout=io.StringIO())
            self.assertEqual(json.loads((target / 'data/catalog.json').read_text()), self.catalog)
            html = (target / 'index.html').read_text()
            self.assertIn('content="./data/catalog.json"', html)
            self.assertNotIn('/api/catalog/', html)
            for url in re.findall(r'(?:href|src)="([^"]+)"', html):
                if url.startswith('#'):
                    continue
                resolved = urljoin('https://example.github.io/greeklabs/', url)
                self.assertTrue(resolved.startswith('https://example.github.io/greeklabs/'), resolved)
                self.assertTrue((target / url).is_file(), url)
            for file in (settings.BASE_DIR / 'static').rglob('*'):
                if file.is_file():
                    self.assertEqual((target / 'static' / file.relative_to(settings.BASE_DIR / 'static')).read_bytes(), file.read_bytes())
            self.assertEqual({p.name for p in target.iterdir()}, {'index.html','static','data','.nojekyll','.greeklabs-export'})
            call_command('export_pages', output=target, stdout=io.StringIO())
            # The export's storage settings must not change the local Django shell.
            self.assertContains(self.client.get('/revision/'), 'href="/static/css/app.css"')
            self.assertContains(self.client.get('/revision/'), 'content="/api/catalog/"')

    def test_invalid_content_does_not_replace_previous_pages_export(self):
        with tempfile.TemporaryDirectory() as temp:
            target = Path(temp) / 'site'
            call_command('export_pages', output=target, stdout=io.StringIO())
            previous = (target / 'data/catalog.json').read_bytes()
            invalid = Path(temp) / 'invalid.json'
            invalid.write_text('{"schema_version": 999}')
            with override_settings(CONTENT_CATALOG=invalid), self.assertRaises(CommandError):
                call_command('export_pages', output=target, stdout=io.StringIO())
            self.assertEqual((target / 'data/catalog.json').read_bytes(), previous)

    def test_pages_export_refuses_source_or_unmanaged_directories(self):
        with tempfile.TemporaryDirectory() as temp:
            target = Path(temp)
            existing = target / 'keep.txt'
            existing.write_text('Do not delete')
            with self.assertRaises(CommandError):
                call_command('export_pages', output=target, stdout=io.StringIO())
            self.assertEqual(existing.read_text(), 'Do not delete')
        for path in (settings.BASE_DIR, settings.BASE_DIR / 'static' / 'export'):
            with self.assertRaises(CommandError):
                call_command('export_pages', output=path, stdout=io.StringIO())
