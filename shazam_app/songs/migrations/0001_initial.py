from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='Song',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=255)),
                ('artist', models.CharField(blank=True, max_length=255)),
                ('album', models.CharField(blank=True, max_length=255)),
                ('audio_file', models.FileField(upload_to='songs/')),
                ('duration_seconds', models.FloatField(blank=True, null=True)),
                ('fingerprinted', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
        ),
        migrations.CreateModel(
            name='Fingerprint',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('hash_value', models.CharField(db_index=True, max_length=40)),
                ('offset', models.IntegerField()),
                ('song', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,
                                           related_name='fingerprints', to='songs.song')),
            ],
        ),
        migrations.AddIndex(
            model_name='fingerprint',
            index=models.Index(fields=['hash_value'], name='songs_finge_hash_va_idx'),
        ),
    ]
