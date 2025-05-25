import django_filters
from django.db.models import Q
from .models import Supplement, Condition

class SupplementFilter(django_filters.FilterSet):
    conditions = django_filters.CharFilter(method='filter_by_related_condition_names')
    benefits = django_filters.CharFilter(method='filter_by_related_condition_names')
    side_effects = django_filters.CharFilter(method='filter_by_related_condition_names')
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

    # If you had other specific filter logic in your SupplementViewSet,
    # for example, for 'brands', 'dosage', 'frequency', you might need to add CharFilter
    # with custom methods for them here as well, or use appropriate filter types
    # from django-filters if they match your needs.
    # Example for brands (if it was a CharField on Rating model and you want to filter by names):
    # brands = django_filters.CharFilter(field_name='ratings__brands', lookup_expr='icontains') 
    # This needs to match how 'brands' is stored and how you want to filter.
    # The existing frontend sends brands as comma-separated names, so it would also need a custom method.

    # Example: if 'brands' on the frontend sends comma-separated brand names
    # brands = django_filters.CharFilter(method='filter_by_brands_names')
    # def filter_by_brands_names(self, queryset, name, value):
    #     if not value:
    #         return queryset
    #     brand_names = [n.strip() for n in value.split(',') if n.strip()]
    #     if not brand_names:
    #         return queryset
    #     return queryset.filter(ratings__brands__in=brand_names).distinct() # Adjust 'ratings__brands__in' if brands is not a simple string on Rating model

    # Example: if 'brands' on the frontend sends comma-separated brand names
    # brands = django_filters.CharFilter(method='filter_by_brands_names')
    # def filter_by_brands_names(self, queryset, name, value):
    #     if not value:
    #         return queryset
    #     brand_names = [n.strip() for n in value.split(',') if n.strip()]
    #     if not brand_names:
    #         return queryset
    #     return queryset.filter(ratings__brands__in=brand_names).distinct() # Adjust 'ratings__brands__in' if brands is not a simple string on Rating model 