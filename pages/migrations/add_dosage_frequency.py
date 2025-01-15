from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('pages', '0002_brand'),
    ]

    operations = [
        migrations.AddField(
            model_name='rating',
            name='dosage_frequency',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='rating',
            name='frequency_unit',
            field=models.CharField(
                max_length=10,
                choices=[
                    ('day', 'Per Day'),
                    ('week', 'Per Week'),
                    ('month', 'Per Month'),
                    ('year', 'Per Year')
                ],
                blank=True,
                null=True
            ),
        ),
    ] 