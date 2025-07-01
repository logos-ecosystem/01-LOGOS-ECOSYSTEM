import React, { useState, useCallback } from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  Pagination,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  SelectChangeEvent,
} from '@mui/material';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useDebounce } from 'use-debounce';
import SearchBar from '../../components/Marketplace/SearchBar';
import CategoryFilter from '../../components/Marketplace/CategoryFilter';
import ItemCard from '../../components/Marketplace/ItemCard';
import { marketplaceApi } from '../../services/api/marketplace';
import { MarketplaceItem, MarketplaceFilters, SortOption } from '../../types/marketplace';

const ITEMS_PER_PAGE = 12;

const sortOptions: SortOption[] = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'rating', label: 'Highest Rated' },
];

const MarketplacePage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [filters, setFilters] = useState<MarketplaceFilters>({
    priceRange: [0, 10000],
    tags: [],
    verified: false,
  });

  const [debouncedSearchQuery] = useDebounce(searchQuery, 500);

  const { data, isPending, error } = useQuery({
    queryKey: ['marketplace-items', page, debouncedSearchQuery, selectedCategory, sortBy, filters],
    queryFn: () =>
      marketplaceApi.getItems({
        page,
        limit: ITEMS_PER_PAGE,
        search: debouncedSearchQuery,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        sortBy,
        ...filters,
      }),
    placeholderData: keepPreviousData,
  });

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    setPage(1);
  }, []);

  const handleCategoryChange = useCallback((category: string) => {
    setSelectedCategory(category);
    setPage(1);
  }, []);

  const handleSortChange = (event: SelectChangeEvent) => {
    setSortBy(event.target.value);
    setPage(1);
  };

  const handleFiltersChange = useCallback((newFilters: MarketplaceFilters) => {
    setFilters(newFilters);
    setPage(1);
  }, []);

  const totalPages = data ? Math.ceil(data.total / ITEMS_PER_PAGE) : 0;

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom align="center" sx={{ mb: 4 }}>
        LOGOS Marketplace
      </Typography>

      <Grid container spacing={3}>
        {/* Filters Sidebar */}
        <Grid item xs={12} md={3}>
          <Stack spacing={3}>
            <SearchBar
              value={searchQuery}
              onChange={handleSearchChange}
              onFiltersChange={handleFiltersChange}
              filters={filters}
            />
            <CategoryFilter
              selectedCategory={selectedCategory}
              onCategoryChange={handleCategoryChange}
            />
          </Stack>
        </Grid>

        {/* Main Content */}
        <Grid item xs={12} md={9}>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              {data && `${data.total} items found`}
            </Typography>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Sort By</InputLabel>
              <Select value={sortBy} onChange={handleSortChange} label="Sort By">
                {sortOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Loading State */}
          {isPending && (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
              <CircularProgress />
            </Box>
          )}

          {/* Error State */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              An error occurred while loading marketplace items. Please try again later.
            </Alert>
          )}

          {/* Items Grid */}
          {data && !isPending && (
            <>
              <Grid container spacing={3}>
                {data.items.map((item: MarketplaceItem) => (
                  <Grid item xs={12} sm={6} lg={4} key={item.id}>
                    <ItemCard item={item} />
                  </Grid>
                ))}
              </Grid>

              {/* Empty State */}
              {data.items.length === 0 && (
                <Box
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  justifyContent="center"
                  minHeight={400}
                  sx={{ textAlign: 'center' }}
                >
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No items found
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Try adjusting your search or filters
                  </Typography>
                </Box>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <Box display="flex" justifyContent="center" sx={{ mt: 4 }}>
                  <Pagination
                    count={totalPages}
                    page={page}
                    onChange={handlePageChange}
                    color="primary"
                    size="large"
                    showFirstButton
                    showLastButton
                  />
                </Box>
              )}
            </>
          )}
        </Grid>
      </Grid>
    </Container>
  );
};

export default MarketplacePage;