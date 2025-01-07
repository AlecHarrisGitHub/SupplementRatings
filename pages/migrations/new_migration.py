from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('pages', '0014_add_is_edited_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='rating',
            name='dosage',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='rating',
            name='brands',
            field=models.CharField(blank=True, max_length=200, null=True),
        ),
    ] 