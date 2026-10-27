from django.urls import path

from .views import revision_home

urlpatterns = [
    path("", revision_home, name="revision_home"),
]
