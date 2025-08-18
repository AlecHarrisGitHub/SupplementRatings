from django.db import migrations, models


def forwards_update_default_path(apps, schema_editor):
    Profile = apps.get_model('pages', 'Profile')
    # Update any existing rows that still point to bare 'default.jpg' to the correct subpath
    Profile.objects.filter(image='default.jpg').update(image='profile_pics/default.jpg')


class Migration(migrations.Migration):

    dependencies = [
        ('pages', '0014_add_is_edited_fields'),
    ]

    operations = [
        migrations.AlterField(
            model_name='profile',
            name='image',
            field=models.ImageField(default='profile_pics/default.jpg', upload_to='profile_pics/'),
        ),
        migrations.RunPython(forwards_update_default_path, migrations.RunPython.noop),
    ]


