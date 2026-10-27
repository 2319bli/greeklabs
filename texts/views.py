from django.http import JsonResponse
from django.views.decorators.http import require_GET
from .catalog import load_catalog, ContentError

@require_GET
def catalog(request):
    try:
        response=JsonResponse(load_catalog(),json_dumps_params={'ensure_ascii':False})
    except ContentError:
        return JsonResponse({'error':'The content catalogue could not be loaded. Run manage.py validate_content to identify the issue.'},status=503)
    response['Cache-Control']='no-cache'
    return response

@require_GET
def all_texts(request):
    try: data=load_catalog()
    except ContentError: return JsonResponse({'error':'Content unavailable'},status=503)
    return JsonResponse({t['id']:{**t,'sections':[s for s in data['sections'] if s['text_id']==t['id']]} for t in data['texts']})

@require_GET
def single_text(request,text_id):
    try: data=load_catalog()
    except ContentError: return JsonResponse({'error':'Content unavailable'},status=503)
    text=next((t for t in data['texts'] if t['id']==text_id),None)
    if text is None: return JsonResponse({'error':'Unknown text'},status=404)
    return JsonResponse({**text,'sections':[s for s in data['sections'] if s['text_id']==text_id]})
