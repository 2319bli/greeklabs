from django.shortcuts import render


def revision_home(request):
    return render(request, "revision/index.html")

# Create your views here.
