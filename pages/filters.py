import django_filters
from django.db.models import Q
from .models import Supplement, Condition

class SupplementFilter(django_filters.FilterSet):
    conditions = django_filters.CharFilter(method='filter_by_related_condition_names')
    benefits = django_filters.CharFilter(method='filter_by_related_condition_names')
    side_effects = django_filters.CharFilter(method='filter_by_related_condition_names')
    brands = django_filters.CharFilter(method='filter_by_brands_names')
    # Add other filters from your existing view if they were handled directly there before
    # For example: category, brands, dosage, frequency

    class Meta:
        model = Supplement
        fields = {
            'name': ['icontains'], # Or however you were filtering name before
            'category': ['exact'], # Example
            # Add other direct fields if needed
        }

    def filter_by_related_condition_names(self, queryset, name, value):
        """
        Filters supplements based on comma-separated condition names.
        The 'name' argument will be 'conditions', 'benefits', or 'side_effects'.
        """
        if not value:
            return queryset

        condition_names = [n.strip() for n in value.split(',') if n.strip()]
        if not condition_names:
            return queryset

        # Build the query path based on the filter name
        if name == 'conditions': # This is for the 'Purpose' field
            query_path_prefix = 'ratings__conditions__name__in'
        elif name == 'benefits':
            query_path_prefix = 'ratings__benefits__name__in'
        elif name == 'side_effects':
            query_path_prefix = 'ratings__side_effects__name__in'
        else:
            return queryset # Should not happen if only registered for these three

        query = Q(**{query_path_prefix: condition_names})
        return queryset.filter(query).distinct()

    def filter_by_brands_names(self, queryset, name, value):
        """
        Filters supplements to those that have at least one rating whose
        'brands' CharField contains any of the provided brand names.
        Frontend sends comma-separated brand names.
        """
        if not value:
            return queryset
        brand_names = [n.strip() for n in value.split(',') if n.strip()]
        if not brand_names:
            return queryset

        # Use icontains OR chain so that a rating with comma-separated brands matches
        brand_q = Q()
        for bn in brand_names:
            brand_q |= Q(ratings__brands__icontains=bn)
        return queryset.filter(brand_q).distinct()