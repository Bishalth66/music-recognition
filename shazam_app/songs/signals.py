import logging
from django.db.models.signals import post_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)


@receiver(post_save, sender='songs.Song')
def auto_fingerprint(sender, instance, created, **kwargs):
    """
    After a Song is saved (created OR audio_file replaced), regenerate fingerprints.
    We skip if the song was just saved by fingerprint_file_path itself
    (fingerprinted=True, duration already set) to avoid infinite recursion.
    The check: if the save only touched 'fingerprinted'/'duration_seconds' we skip.
    """
    # update_fields is set by fingerprint_file_path — skip to avoid recursion
    update_fields = kwargs.get('update_fields')
    if update_fields and set(update_fields) <= {'fingerprinted', 'duration_seconds'}:
        return

    if not instance.audio_file:
        return

    try:
        from songs.fingerprint import fingerprint_file_path
        count = fingerprint_file_path(instance)
        logger.info("Fingerprinted '%s' → %d hashes", instance, count)
    except Exception as exc:
        logger.exception("Fingerprinting failed for song %s: %s", instance.pk, exc)
