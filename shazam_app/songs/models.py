from django.db import models
from django.conf import settings


class Song(models.Model):
    title           = models.CharField(max_length=255)
    artist          = models.CharField(max_length=255, blank=True)
    album           = models.CharField(max_length=255, blank=True)
    lyrics          =models.TextField(blank=True)
    audio_file      = models.FileField(upload_to='songs/')
    duration_seconds = models.FloatField(null=True, blank=True)
    fingerprinted   = models.BooleanField(default=False)
    created_at      = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} — {self.artist}" if self.artist else self.title


class Fingerprint(models.Model):
    song        = models.ForeignKey(Song, on_delete=models.CASCADE, related_name='fingerprints')
    hash_value  = models.CharField(max_length=40, db_index=True)
    offset      = models.IntegerField()  # time frame index in the spectrogram
    class Meta:
        indexes = [models.Index(fields=['hash_value'])]
    def __str__(self):
        return f"{self.hash_value} @ {self.offset}"


class UserSongInteraction(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='song_interactions',
    )
    song = models.ForeignKey(
        Song,
        on_delete=models.CASCADE,
        related_name='user_interactions',
    )
    favorite = models.BooleanField(default=False)
    rating = models.PositiveSmallIntegerField(default=0)
    note = models.TextField(blank=True)
    playlist = models.CharField(max_length=120, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'song'],
                name='unique_user_song_interaction',
            ),
            models.CheckConstraint(
                check=models.Q(rating__gte=0) & models.Q(rating__lte=5),
                name='interaction_rating_between_0_and_5',
            ),
        ]
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.user} - {self.song}"
