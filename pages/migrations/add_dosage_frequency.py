from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('pages', '0001_supplement_dosage_unit'),
    ]

    operations = [
        migrations.AddField(
            model_name='rating',
            name='dosage_frequency',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='rating',
            name='dosage_period',
            field=models.CharField(blank=True, max_length=20, null=True),
        ),
    ] 