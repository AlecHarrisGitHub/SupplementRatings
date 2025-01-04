from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('pages', '0013_alter_rating_unique_together_rating_conditions_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='rating',
            name='is_edited',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='comment',
            name='is_edited',
            field=models.BooleanField(default=False),
        ),
    ] 