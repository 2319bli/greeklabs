"""Versioned, data-only content catalogue and strict import validation."""
import copy
import json
import re
from pathlib import Path
from django.conf import settings

COLLECTIONS = ('texts','sections','grammar','vocabulary','unseen','compositions','annotations','questions')
STATUSES = ('published','draft','sample')
DIFFICULTIES = ('foundation','developing','advanced')
IDENTIFIER = re.compile(r'^[a-z0-9][a-z0-9_-]*$')

class ContentError(ValueError):
    pass

def catalog_path():
    return Path(getattr(settings, 'CONTENT_CATALOG', settings.BASE_DIR / 'data/content/catalog.json'))

def read_json(path):
    def unique(pairs):
        out = {}
        for k,v in pairs:
            if k in out: raise ContentError(f'Duplicate JSON key: {k}')
            out[k]=v
        return out
    try:
        return json.loads(Path(path).read_text(encoding='utf-8'),object_pairs_hook=unique)
    except (ValueError,OSError) as exc:
        raise ContentError(f'Cannot read content: {exc}') from exc

def validate(c):
    errors=[]
    def err(path,message): errors.append(f'{path}: {message}')
    def string(obj,key,path,required=False):
        if key not in obj:
            if required: err(path+'.'+key,'required')
        elif not isinstance(obj[key],str) or (required and not obj[key].strip()): err(path+'.'+key,'must be a non-empty string' if required else 'must be a string')
    def strings(obj,key,path):
        if key in obj and (not isinstance(obj[key],list) or any(not isinstance(v,str) for v in obj[key])): err(path+'.'+key,'must be an array of strings')
    def enum(obj,key,values,path,required=False):
        if key in obj or required:
            if obj.get(key) not in values: err(path+'.'+key,'must be one of '+', '.join(values))
    def positive(obj,key,path,required=False):
        if key in obj or required:
            if type(obj.get(key)) is not int or obj[key]<1: err(path+'.'+key,'must be a positive integer')
    if not isinstance(c,dict): return ['Catalogue must be an object']
    if type(c.get('schema_version')) is not int or c['schema_version'] != 1: err('schema_version','must be 1')
    for k in c:
        if k not in (*COLLECTIONS,'schema_version'): err(k,'unknown collection')
    maps={}
    for group in COLLECTIONS:
        items=c.get(group)
        if not isinstance(items,list): err(group,'must be an array'); items=[]
        maps[group]={}
        for i,item in enumerate(items):
            path=f'{group}[{i}]'
            if not isinstance(item,dict): err(path,'must be an object'); continue
            string(item,'id',path,True); string(item,'title',path,group!='annotations')
            ident=item.get('id')
            if not isinstance(ident,str) or not IDENTIFIER.fullmatch(ident): err(path+'.id','use lowercase letters, digits, hyphens or underscores')
            elif ident in maps[group]: err(path+'.id',f'duplicate identifier {ident}')
            else: maps[group][ident]=item
            enum(item,'status',STATUSES,path,True)
            enum(item,'difficulty',DIFFICULTIES,path,group in ('unseen','compositions'))
            for key in ('author','genre','scope','description','reference','greek','translation','source','summary','explanation','category','english','model_greek','notes','format','quote','technique','effect','context','guidance','question','alignment_note','source_note'):
                string(item,key,path)
            for key in ('topic_ids','related_ids','hints','alternatives','points','quotations','section_ids'): strings(item,key,path)
            if group=='texts':
                for k in ('author','genre','scope'): string(item,k,path,True)
            if group in ('sections','unseen','compositions'): positive(item,'number',path,True)
            if group=='sections':
                string(item,'text_id',path,True);string(item,'reference',path,True)
                enum(item,'alignment',('line','sentence','subsection','section'),path,True)
                enum(item,'translation_type',('literal','supplied','literary'),path)
                for key in ('greek','translation'): string(item,key,path,item.get('status')=='published')
                for key in ('line_start','line_end'): positive(item,key,path)
                if ('line_start' in item) != ('line_end' in item): err(path,'line_start and line_end must be supplied together')
                if type(item.get('line_start')) is int and type(item.get('line_end')) is int and item['line_end']<item['line_start']: err(path,'line_end precedes line_start')
                units=item.get('units')
                if not isinstance(units,list): err(path+'.units','must be an array'); units=[]
                if item.get('status')=='published' and not units: err(path+'.units','published sections need at least one reading unit')
                ids=set(); last_end=0
                for j,u in enumerate(units):
                    up=f'{path}.units[{j}]'
                    if not isinstance(u,dict): err(up,'must be an object'); continue
                    for k in ('id','reference','greek','translation'): string(u,k,up,k in ('id','reference') or item.get('status')=='published')
                    uid=u.get('id')
                    if not isinstance(uid,str) or not IDENTIFIER.fullmatch(uid): err(up+'.id','invalid identifier')
                    elif uid in ids: err(up+'.id','duplicate unit identifier')
                    else: ids.add(uid)
                    for k in ('line_start','line_end'): positive(u,k,up)
                    if ('line_start' in u)!=('line_end' in u): err(up,'supply both line_start and line_end')
                    if type(u.get('line_start')) is int and type(u.get('line_end')) is int:
                        if u['line_start']<=last_end or u['line_end']<u['line_start']: err(up,'line ranges must increase without overlap')
                        if type(item.get('line_start')) is int and type(item.get('line_end')) is int and not item['line_start']<=u['line_start']<=u['line_end']<=item['line_end']: err(up,'line range outside section')
                        last_end=u['line_end']
                    validate_pairs(u,'glosses',('greek','english'),up,err)
                    validate_pairs(u,'grammar_notes',('topic_id','note'),up,err)
                lines=item.get('lines',[])
                if not isinstance(lines,list): err(path+'.lines','must be an array'); lines=[]
                previous=0; line_ids=set()
                for j,line in enumerate(lines):
                    lp=f'{path}.lines[{j}]'
                    if not isinstance(line,dict): err(lp,'must be an object');continue
                    for k in ('id','text'): string(line,k,lp,True)
                    string(line,'speaker',lp); positive(line,'number',lp,True)
                    n=line.get('number'); lid=line.get('id')
                    if not isinstance(lid,str) or not IDENTIFIER.fullmatch(lid) or lid in line_ids: err(lp+'.id','invalid or duplicate line identifier')
                    else: line_ids.add(lid)
                    if type(n) is int:
                        if n<=previous or (previous and n!=previous+1): err(lp+'.number','line numbers must be consecutive and increasing')
                        previous=n
                if lines and type(item.get('line_start')) is int and isinstance(lines[0],dict) and isinstance(lines[-1],dict):
                    if lines[0].get('number')!=item['line_start'] or lines[-1].get('number')!=item['line_end']: err(path+'.lines','numbers must match the section range')
            if group=='grammar':
                string(item,'category',path,True);string(item,'explanation',path,item.get('status')=='published')
                validate_pairs(item,'examples',('greek','english'),path,err)
                validate_pairs(item,'exercises',('id','prompt','answer'),path,err)
                exercise_ids=set()
                for exercise in item.get('exercises',[]) if isinstance(item.get('exercises',[]),list) else []:
                    eid=exercise.get('id') if isinstance(exercise,dict) else None
                    if not isinstance(eid,str) or not IDENTIFIER.fullmatch(eid) or eid in exercise_ids: err(path+'.exercises','invalid or duplicate exercise id')
                    else: exercise_ids.add(eid)
            if group=='vocabulary':
                for k in ('greek','english'): string(item,k,path,True)
            if group=='unseen':
                for k in ('author','genre','source'): string(item,k,path,True)
                enum(item,'origin',('original','adapted','composed'),path,True)
                for k in ('greek','translation'): string(item,k,path,item.get('status')=='published')
                validate_pairs(item,'glosses',('greek','english'),path,err)
            if group=='compositions':
                enum(item,'format',('sentences','continuous'),path,True)
                for k in ('english','model_greek'): string(item,k,path,item.get('status')=='published')
                validate_pairs(item,'vocabulary',('greek','english'),path,err)
            if group in ('annotations','questions'):
                string(item,'text_id',path,True)
                if group=='annotations':
                    for k in ('section_id','reference','quote','technique','effect','context'): string(item,k,path,True)
                    string(item,'unit_id',path)
                else:
                    string(item,'question',path,True);string(item,'reference',path,True)
    # Reference checks run after every index has been built.
    for group in COLLECTIONS:
        numbers=set()
        for ident,item in maps[group].items():
            path=f'{group}.{ident}'
            if group in ('sections','annotations','questions') and (not isinstance(item.get('text_id'),str) or item.get('text_id') not in maps['texts']): err(path+'.text_id','unknown set text')
            if group in ('sections','unseen','compositions'):
                key=(str(item.get('text_id','')),str(item.get('number')))
                if key in numbers: err(path+'.number','duplicate number in collection/text')
                numbers.add(key)
            for field in ('topic_ids','related_ids'):
                for ref in item.get(field,[]) if isinstance(item.get(field,[]),list) else []:
                    if not isinstance(ref,str) or ref not in maps['grammar']: err(path+'.'+field,f'unknown grammar topic {ref}')
            refs=item.get('section_ids',[]) if group=='questions' else [item.get('section_id')] if group=='annotations' else []
            for ref in refs if isinstance(refs,list) else []:
                sec=maps['sections'].get(ref) if isinstance(ref,str) else None
                if not sec or sec.get('text_id')!=item.get('text_id'): err(path,'invalid section reference or wrong set text')
                elif group=='annotations' and item.get('unit_id') and item['unit_id'] not in [u.get('id') for u in sec.get('units',[]) if isinstance(u,dict)]: err(path+'.unit_id','unknown reading unit')
            if group=='sections':
                for u in item.get('units',[]) if isinstance(item.get('units'),list) else []:
                    if not isinstance(u,dict): continue
                    for note in u.get('grammar_notes',[]) if isinstance(u.get('grammar_notes',[]),list) else []:
                        if isinstance(note,dict) and (not isinstance(note.get('topic_id'),str) or note.get('topic_id') not in maps['grammar']): err(path,'grammar annotation references an unknown topic')
    return errors

def validate_pairs(item,key,fields,path,err):
    values=item.get(key,[])
    if not isinstance(values,list): err(path+'.'+key,'must be an array'); return
    for i,value in enumerate(values):
        if not isinstance(value,dict) or any(not isinstance(value.get(k),str) or not value[k].strip() for k in fields): err(f'{path}.{key}[{i}]','requires string fields: '+', '.join(fields))

def load_catalog():
    data=read_json(catalog_path())
    errors=validate(data)
    if errors: raise ContentError('\n'.join(errors))
    return data

def merge_catalog(current,incoming,replace=False):
    if not isinstance(incoming,dict) or incoming.get('schema_version')!=1: raise ContentError('Import must have schema_version 1')
    unknown=set(incoming)-set(COLLECTIONS)-{'schema_version'}
    if unknown: raise ContentError('Unknown collections: '+', '.join(sorted(unknown)))
    merged=copy.deepcopy(current)
    for group in COLLECTIONS:
        values=incoming.get(group,[])
        if not isinstance(values,list): raise ContentError(f'{group} must be an array')
        seen=set(); existing={item['id']:i for i,item in enumerate(merged[group])}
        for item in values:
            if not isinstance(item,dict) or not isinstance(item.get('id'),str): raise ContentError(f'{group}: every entry requires an id')
            ident=item['id']
            if ident in seen: raise ContentError(f'{group}: duplicate imported id {ident}')
            seen.add(ident)
            if ident in existing:
                if not replace: raise ContentError(f'{group}.{ident} already exists; use --replace-existing for intentional updates')
                merged[group][existing[ident]]=copy.deepcopy(item)
            else: merged[group].append(copy.deepcopy(item))
    errors=validate(merged)
    if errors: raise ContentError('\n'.join(errors))
    return merged
