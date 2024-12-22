from django.db import models
from django.contrib.auth.models import User


class Supplement(models.Model):
    name = models.CharField(max_length=200)
    category = models.CharField(max_length=200, default='General')

    def __str__(self):
        return self.name


class Condition(models.Model):
    name = models.CharField(max_length=200)

    def __str__(self):
        return self.name


class Rating(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    supplement = models.ForeignKey(Supplement, related_name='ratings', on_delete=models.CASCADE)
    condition = models.ForeignKey(Condition, related_name='ratings', on_delete=models.CASCADE, null=True)
    score = models.IntegerField(default=0)
    comment = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'supplement', 'condition')

    def __str__(self):
        return f"Rating for {self.supplement.name} - {self.score}/5"


class Comment(models.Model):
    rating = models.ForeignKey(Rating, related_name='comments', on_delete=models.CASCADE, null=True, blank=True)
    parent_comment = models.ForeignKey('self', related_name='replies', on_delete=models.CASCADE, null=True, blank=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        if self.rating:
            return f"Comment on rating {self.rating}"
        return f"Reply to comment {self.parent_comment_id}"