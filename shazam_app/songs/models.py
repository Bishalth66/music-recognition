from django.db import models


class Song(models.Model):
    title           = models.CharField(max_length=255)
    artist          = models.CharField(max_length=255, blank=True)
    album           = models.CharField(max_length=255, blank=True)
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
        return f"{self.hash_value} @ {self.offset} → {self.song}"
