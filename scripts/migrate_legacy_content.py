"""One-time lossless conversion of the supplied text files. Never overwrite a catalogue."""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data/content/catalog.json'
COLLECTIONS = ['texts', 'sections', 'grammar', 'vocabulary', 'unseen', 'compositions', 'annotations', 'questions']

def split_sections(text):
    result = {}
    for match in re.finditer(r'(?m)^(?:Section\s+(\d+)(?:\s+\((\d+)-(\d+)\))?\s*|([0-9]+)\.\s*)', text):
        key = match[1] or match[4]
        result[key] = {'header': match.group(), 'start': match.end(), 'offset': match.start(), 'line_start': int(match[2]) if match[2] else None, 'line_end': int(match[3]) if match[3] else None}
    values = list(result.values())
    for i, value in enumerate(values):
        value['body'] = text[value['start']:values[i+1]['offset'] if i+1 < len(values) else len(text)].strip()
    return result

def subsections(body):
    parts = re.split(r'(?m)^\s*\[(\d+)\]\s*', body)
    return {'1': parts[0].strip(), **{parts[i]: parts[i+1].strip() for i in range(1,len(parts),2)}}

def build():
    c = {'schema_version': 1, **{k: [] for k in COLLECTIONS}}
    for id, title, author, genre, scope, description, status in [
        ('electra','Electra','Sophocles','Tragedy','Lines 1–85 & 254–416','','published'),
        ('herodotus','Histories · Book 7','Herodotus','History','Chapters 207–226','','published'),
        ('odyssey-22','Odyssey · Book 22','Homer','Epic','Lines 1–238','','draft'),
        ('herodotus-8','Histories · Book 8','Herodotus','History','Chapters 6–26','','draft')]:
        c['texts'].append(dict(id=id,title=title,author=author,genre=genre,scope=scope,description=description,status=status))
    for text_id, grfile, enfile in [('electra','electragr.txt','electratrans.txt'),('herodotus','herodgr.txt','herodtrans.txt')]:
        gr = split_sections((ROOT/grfile).read_text()); en = split_sections((ROOT/enfile).read_text())
        for number, section in gr.items():
            greek, english = section['body'], en[number]['body']
            ref = f"Lines {section['line_start']}–{section['line_end']}" if text_id=='electra' else f'7.{number}'
            record = dict(id=f'{text_id}-{number}',text_id=text_id,number=int(number),title=f'Section {number}' if text_id=='electra' else f'Chapter {number}',reference=ref,status='published',greek=greek,translation=english,translation_type='supplied',source=f'Original project: {grfile} / {enfile}',topic_ids=[],units=[])
            if text_id=='herodotus':
                gparts, eparts = subsections(greek), subsections(english)
                assert gparts.keys()==eparts.keys(), number
                record['alignment']='subsection'
                for n in gparts:
                    record['units'].append(dict(id=f'p{n}',reference=f'7.{number}.{n}',greek=gparts[n],translation=eparts[n],glosses=[],grammar_notes=[]))
            else:
                record.update(alignment='section',line_start=section['line_start'],line_end=section['line_end'])
                record['alignment_note']='The supplied English is aligned to this section, not to individual verses. Verified smaller reading units can be imported later.'
                record['units']=[dict(id='section',reference=ref,greek=greek,translation=english,glosses=[],grammar_notes=[])]
                speakers={'Παιδαγωγός','Ὀρέστης','Ἠλέκτρα','Χρυσόθεμις','Χορός'}
                lines=[]; n=section['line_start']; speaker=''
                for line in greek.splitlines():
                    if not line.strip(): continue
                    if line.strip() in speakers: speaker=line.strip(); continue
                    lines.append(dict(id=f'l{n}',number=n,text=line,speaker=speaker)); n+=1
                # Original source numbering is only asserted where the body agrees with its header.
                if n-1==section['line_end']: record['lines']=lines
                else: record['source_note']=f'Original header says {ref}; body contains {len(lines)} non-speaker lines. Verse numbering awaits verification.'
            c['sections'].append(record)
    # Interface demonstrations contain no new instructional Greek or purported model answers.
    c['grammar']=[dict(id='demo-participles',title='Participles',category='Verbs & verbal forms',status='sample',difficulty='developing',summary='Demonstration topic · a place for your future notes, worked examples and practice.',explanation='This is an interface demonstration, not a grammar explanation. Import reviewed notes to replace this entry.',examples=[],exercises=[],related_ids=['demo-cases'],topic_ids=[]),dict(id='demo-cases',title='Cases & their uses',category='Nouns & syntax',status='sample',difficulty='foundation',summary='Demonstration topic · explanations and examples are awaiting import.',explanation='Your supplied grammar notes will appear here.',examples=[],exercises=[],related_ids=['demo-participles'],topic_ids=[])]
    c['vocabulary']=[dict(id='demo-vocabulary',title='Vocabulary card preview',greek='[Greek headword]',english='[Supplied meaning]',status='sample',topic_ids=['demo-cases'],notes='Interface demonstration only. Import reviewed vocabulary entries.')]
    c['unseen']=[dict(id='demo-unseen-001',number=1,title='Prose passage preview',author='Author to be supplied',genre='Prose',difficulty='foundation',status='sample',origin='adapted',source='Interface demonstration; no passage has been supplied.',topic_ids=['demo-participles'],greek='',translation='',glosses=[],hints=['Optional hints will appear here when supplied.']),dict(id='demo-unseen-002',number=2,title='Verse passage preview',author='Author to be supplied',genre='Verse',difficulty='advanced',status='sample',origin='original',source='Interface demonstration; no passage has been supplied.',topic_ids=['demo-cases'],greek='',translation='',glosses=[],hints=[])]
    c['compositions']=[dict(id='demo-composition-001',number=1,title='Sentence exercise preview',format='sentences',difficulty='foundation',status='sample',topic_ids=['demo-cases'],english='',model_greek='',vocabulary=[],hints=['Optional syntax hints will appear here when supplied.'],alternatives=[],notes='Import an English prompt and reviewed model Greek to use this exercise.'),dict(id='demo-composition-002',number=2,title='Continuous prose preview',format='continuous',difficulty='advanced',status='sample',topic_ids=['demo-participles'],english='',model_greek='',vocabulary=[],hints=[],alternatives=[],notes='This slot demonstrates support for longer composition exercises.')]
    return c

if __name__=='__main__':
    if OUT.exists(): raise SystemExit('Catalogue already exists; use import_content for future changes.')
    OUT.write_text(json.dumps(build(),ensure_ascii=False,indent=2)+'\n')
    print('Preserved 35 literature sections in',OUT)
