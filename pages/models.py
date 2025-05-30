from django.db import models
from django.contrib.auth.models import User
import uuid
from datetime import datetime, timedelta
from django.utils import timezone
from django.core.files.base import ContentFile
from PIL import Image as PILImage
from io import BytesIO
import os


class Supplement(models.Model):
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=100, blank=True, null=True)
    dosage_unit = models.CharField(max_length=20, blank=True, null=True)

    def __str__(self):
        return self.name

    class Meta:
        unique_together = ('name', 'category')


class Condition(models.Model):
    name = models.CharField(max_length=255, unique=True)

    def __str__(self):
        return self.name


class Rating(models.Model):
    FREQUENCY_CHOICES = [
        ('day', 'Per Day'),
        ('week', 'Per Week'),
        ('month', 'Per Month'),
        ('year', 'Per Year')
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    supplement = models.ForeignKey(Supplement, related_name='ratings', on_delete=models.CASCADE)
    conditions = models.ManyToManyField(Condition, related_name='ratings')
    score = models.IntegerField()
    comment = models.TextField(blank=True, null=True)
    dosage = models.CharField(max_length=50, blank=True, null=True)
    dosage_frequency = models.PositiveIntegerField(blank=True, null=True)
    frequency_unit = models.CharField(
        max_length=10,
        choices=FREQUENCY_CHOICES,
        blank=True,
        null=True
    )
    brands = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    upvotes = models.PositiveIntegerField(default=0)
    is_edited = models.BooleanField(default=False)
    image = models.ImageField(upload_to='ratings/', blank=True, null=True)

    def __str__(self):
        return f'{self.user.username} - {self.supplement.name} - {self.score}'

    def save(self, *args, **kwargs):
        process_image = False
        if self.pk:
            try:
                old_instance = Rating.objects.get(pk=self.pk)
                if old_instance.image != self.image:
                    process_image = True
            except Rating.DoesNotExist:
                process_image = True
        elif self.image:
            process_image = True

        if process_image and self.image and hasattr(self.image.file, 'content_type'):
            try:
                img = PILImage.open(self.image)
                original_format = img.format

                max_width = 1280
                max_height = 1024
                img.thumbnail((max_width, max_height), PILImage.Resampling.LANCZOS)

                buffer = BytesIO()
                save_format = 'WEBP'
                save_kwargs = {'quality': 80}

                if original_format == 'PNG':
                    save_kwargs['lossless'] = True
                
                if img.mode != 'RGB' and img.mode != 'RGBA':
                    img = img.convert('RGBA') if save_format == 'WEBP' and 'lossless' in save_kwargs else img.convert('RGB')

                img.save(buffer, format=save_format, **save_kwargs)
                
                file_name_without_ext, _ = os.path.splitext(self.image.name)
                new_file_name = file_name_without_ext + '.webp'
                
                self.image.save(new_file_name, ContentFile(buffer.getvalue()), save=False)
            except Exception as e:
                print(f"Error processing image for Rating {self.pk}: {e}")
        
        super().save(*args, **kwargs)


class Comment(models.Model):
    rating = models.ForeignKey(Rating, related_name='comments', on_delete=models.CASCADE, null=True, blank=True)
    parent_comment = models.ForeignKey('self', related_name='replies', on_delete=models.CASCADE, null=True, blank=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_edited = models.BooleanField(default=False)
    upvotes = models.PositiveIntegerField(default=0)
    image = models.ImageField(upload_to='comments/', blank=True, null=True)

    def __str__(self):
        if self.rating:
            return f"Comment on rating {self.rating}"
        return f"Reply to comment {self.parent_comment_id}"

    def save(self, *args, **kwargs):
        process_image = False
        if self.pk:
            try:
                old_instance = Comment.objects.get(pk=self.pk)
                if old_instance.image != self.image:
                    process_image = True
            except Comment.DoesNotExist:
                process_image = True
        elif self.image:
            process_image = True

        if process_image and self.image and hasattr(self.image.file, 'content_type'):
            try:
                img = PILImage.open(self.image)
                original_format = img.format

                max_width = 1024
                max_height = 768
                img.thumbnail((max_width, max_height), PILImage.Resampling.LANCZOS)

                buffer = BytesIO()
                save_format = 'WEBP'
                save_kwargs = {'quality': 75}

                if original_format == 'PNG':
                    save_kwargs['lossless'] = True
                
                if img.mode != 'RGB' and img.mode != 'RGBA':
                    img = img.convert('RGBA') if save_format == 'WEBP' and 'lossless' in save_kwargs else img.convert('RGB')

                img.save(buffer, format=save_format, **save_kwargs)
                
                file_name_without_ext, _ = os.path.splitext(self.image.name)
                new_file_name = file_name_without_ext + '.webp'
                
                self.image.save(new_file_name, ContentFile(buffer.getvalue()), save=False)
            except Exception as e:
                print(f"Error processing image for Comment {self.pk}: {e}")
        
        super().save(*args, **kwargs)


class EmailVerificationToken(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timezone.timedelta(hours=24)
        super().save(*args, **kwargs)

    def is_valid(self):
        return timezone.now() < self.expires_at


class Brand(models.Model):
    name = models.CharField(max_length=255, unique=True)

    def __str__(self):
        return self.name


class UserUpvote(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    rating = models.ForeignKey(Rating, null=True, blank=True, on_delete=models.CASCADE)
    comment = models.ForeignKey(Comment, null=True, blank=True, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = (
            ('user', 'rating'), 
            ('user', 'comment')
        )
        indexes = [
            models.Index(fields=['user', 'rating']),
            models.Index(fields=['user', 'comment']),
        ]

    def __str__(self):
        if self.rating:
            return f"{self.user.username} upvoted rating {self.rating.id}"
        return f"{self.user.username} upvoted comment {self.comment.id}"