from django.urls import path
from .views import (
    InteractionDetailView,
    InteractionListView,
    LoginView,
    LogoutView,
    MeView,
    RecognizeView,
    RegisterView,
)

urlpatterns = [
    path('recognize/', RecognizeView.as_view(), name='recognize'),
    path('auth/register/', RegisterView.as_view(), name='auth-register'),
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/logout/', LogoutView.as_view(), name='auth-logout'),
    path('auth/me/', MeView.as_view(), name='auth-me'),
    path('interactions/', InteractionListView.as_view(), name='interactions'),
    path(
        'interactions/<int:song_id>/',
        InteractionDetailView.as_view(),
        name='interaction-detail',
    ),
]
