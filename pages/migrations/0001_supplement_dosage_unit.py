# Generated by Django 5.1.4 on 2025-01-08 19:44

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pages', 'new_migration'),
    ]

    operations = [
        migrations.AddField(
            model_name='supplement',
            name='dosage_unit',
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
    ]
