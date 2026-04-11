from django.urls import path
from .views import RecognizeView

urlpatterns = [
    path('recognize/', RecognizeView.as_view(), name='recognize'),
]
