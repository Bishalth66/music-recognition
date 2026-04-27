from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Count
from .models import Song, Fingerprint

admin.site.site_url = "http://localhost:3000/"


class FingerprintInline(admin.TabularInline):
    model = Fingerprint
    fields = ('hash_value', 'offset')
    readonly_fields = ('hash_value', 'offset')
    extra = 0
    max_num = 0
    can_delete = False
    show_change_link = False

 
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        song_pk = request.resolver_match.kwargs.get('object_id')
        if song_pk:
            limited_ids = (
                qs.filter(song_id=song_pk)
                .values_list('id', flat=True)[:20]
            )
            return qs.filter(id__in=list(limited_ids))
        return qs.none()


@admin.register(Song)
class SongAdmin(admin.ModelAdmin):
    def delete_model(self, request, obj):
        obj.delete()
    def delete_queryset(self, request, queryset):
        queryset.delete()
    def get_deleted_objects(self, objs, request):
         return ([], {}, set(), [])
    list_display = (
        'title', 'artist', 'album', 'duration_display',
        'fingerprint_count', 'fingerprinted', 'created_at',
    )
    list_filter = ('fingerprinted', 'artist')
    search_fields = ('title', 'artist', 'album')
    readonly_fields = (
        'fingerprinted',
        'duration_seconds',
        'created_at',
        'fingerprint_count',
        'audio_player',
    )
    fieldsets = (
        ('Metadata', {
            'fields': ('title', 'artist', 'album', 'lyrics'),
        }),
        ('Audio', {
            'fields': ('audio_file', 'audio_player', 'duration_seconds'),
        }),
        ('Fingerprint Status', {
            'fields': ('fingerprinted', 'fingerprint_count', 'created_at'),
        }),
    )
    inlines = [FingerprintInline]

    # ✅ FIX 1: Annotate the queryset so fingerprint_count needs zero extra queries
    def get_queryset(self, request):
        return super().get_queryset(request).annotate(
            _fingerprint_count=Count('fingerprints')
        )

    @admin.display(description='Duration')
    def duration_display(self, obj):
        if obj.duration_seconds is None:
            return '—'
        m, s = divmod(int(obj.duration_seconds), 60)
        return f"{m}:{s:02d}"

    # ✅ FIX 1 (cont.): Read the annotation instead of hitting the DB again
    @admin.display(description='Fingerprints', ordering='_fingerprint_count')
    def fingerprint_count(self, obj):
        return obj._fingerprint_count

    @admin.display(description='Preview')
    def audio_player(self, obj):
        if obj.audio_file:
            return format_html(
                '<audio controls style="width:320px">'
                '<source src="{}" />'
                '</audio>',
                obj.audio_file.url,
            )
        return '—'

    @admin.action(description='Re-fingerprint selected songs')
    def re_fingerprint(self, request, queryset):
        from songs.fingerprint import fingerprint_file_path
        ok, fail = 0, 0
        for song in queryset:
            try:
                fingerprint_file_path(song)
                ok += 1
            except Exception:
                fail += 1
        self.message_user(
            request,
            f"Re-fingerprinted {ok} song(s). Failures: {fail}.",
        )

    actions = ['re_fingerprint']


@admin.register(Fingerprint)
class FingerprintAdmin(admin.ModelAdmin):
    list_display = ('hash_value', 'offset', 'song')
    search_fields = ('hash_value', 'song__title')
    raw_id_fields = ('song',)
    readonly_fields = ('hash_value', 'offset', 'song')

   