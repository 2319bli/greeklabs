from django.urls import path

from . import views

urlpatterns = [
    path("", views.all_texts, name="all_texts"),
    path("<str:text_id>/", views.single_text, name="single_text"),
]
