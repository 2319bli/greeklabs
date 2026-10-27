from django.contrib import admin
from django.urls import include, path
from texts.views import catalog

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('core.urls')),
    path('api/catalog/', catalog, name='catalog'),
    path('api/texts/', include('texts.urls')),
]
