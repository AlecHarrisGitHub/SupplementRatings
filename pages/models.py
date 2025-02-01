from django.db import models
from django.contrib.auth.models import User
import uuid
from datetime import datetime, timedelta


class Supplement(models.Model):
    name = models.CharField(max_length=200)
    category = models.CharField(max_length=200, default='General')
    dosage_unit = models.CharField(max_length=50, blank=True, null=True)

    def __str__(self):
        return self.name


class Condition(models.Model):
    name = models.CharField(max_length=200)

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
    score = models.IntegerField(default=0)
    comment = models.TextField(blank=True, null=True)
    dosage = models.CharField(max_length=100, blank=True, null=True)
    dosage_frequency = models.IntegerField(blank=True, null=True, default=1)
    frequency_unit = models.CharField(
        max_length=10,
        choices=FREQUENCY_CHOICES,
        blank=True,
        null=True,
        default='day'
    )
    brands = models.CharField(max_length=200, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_edited = models.BooleanField(default=False)
    upvotes = models.IntegerField(default=0)
    image = models.ImageField(upload_to='ratings/', null=True, blank=True)

    class Meta:
        unique_together = ('user', 'supplement')

    def __str__(self):
        return f"Rating for {self.supplement.name} - {self.score}/5"


class Comment(models.Model):
    rating = models.ForeignKey(Rating, related_name='comments', on_delete=models.CASCADE, null=True, blank=True)
    parent_comment = models.ForeignKey('self', related_name='replies', on_delete=models.CASCADE, null=True, blank=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_edited = models.BooleanField(default=False)
    upvotes = models.IntegerField(default=0)
    image = models.ImageField(upload_to='comments/', null=True, blank=True)

    def __str__(self):
        if self.rating:
            return f"Comment on rating {self.rating}"
        return f"Reply to comment {self.parent_comment_id}"


class EmailVerificationToken(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    token = models.UUIDField(default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    def save(self, *args, **kwargs):
        from django.utils import timezone
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(hours=24)
        super().save(*args, **kwargs)

    def is_valid(self):
        from django.utils import timezone
        return timezone.now() <= self.expires_at


class Brand(models.Model):
    name = models.CharField(max_length=200)

    def __str__(self):
        return self.name


class UserUpvote(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    rating = models.ForeignKey(Rating, on_delete=models.CASCADE, null=True, blank=True)
    comment = models.ForeignKey(Comment, on_delete=models.CASCADE, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [
            ('user', 'rating'),
            ('user', 'comment')
        ]

    def __str__(self):
        if self.rating:
            return f"{self.user.username} upvoted rating {self.rating.id}"
        return f"{self.user.username} upvoted comment {self.comment.id}"