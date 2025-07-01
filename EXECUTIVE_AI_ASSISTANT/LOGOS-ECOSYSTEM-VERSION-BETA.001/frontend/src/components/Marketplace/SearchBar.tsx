import React, { useState, useEffect, useRef } from 'react';
import {
  Paper,
  InputBase,
  IconButton,
  Box,
  Button,
  Popover,
  Typography,
  Slider,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Chip,
  Stack,
  Divider,
  Badge,
  Autocomplete,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  ToggleButton,
  ToggleButtonGroup,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  TrendingUp as TrendingIcon,
  History as HistoryIcon,
  Bookmark as BookmarkIcon,
  ViewModule as GridIcon,
  ViewList as ListIcon,
} from '@mui/icons-material';
import { MarketplaceFilters } from '../../types/marketplace';
import { useDebounce } from '../../hooks/useDebounce';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onFiltersChange: (filters: MarketplaceFilters) => void;
  filters: MarketplaceFilters;
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  suggestions?: string[];
  recentSearches?: string[];
  onSearch?: (query: string) => void;
}

const popularTags = [
  'AI-powered',
  'Open Source',
  'Premium',
  'Template',
  'API',
  'Plugin',
  'Dataset',
  'Model',
  'Tool',
  'Framework',
];

const categories = [
  'All Categories',
  'AI Models',
  'Datasets',
  'APIs & Services',
  'Templates',
  'Plugins & Extensions',
  'Educational',
  'Tools & Utilities',
  'Frameworks',
  'Other',
];

const sortOptions = [
  { value: 'relevance', label: 'Most Relevant' },
  { value: 'newest', label: 'Newest First' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'popular', label: 'Most Popular' },
];

const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onFiltersChange,
  filters,
  viewMode = 'grid',
  onViewModeChange,
  suggestions = [],
  recentSearches = [],
  onSearch,
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [localFilters, setLocalFilters] = useState<MarketplaceFilters>(filters);
  const [searchAnchorEl, setSearchAnchorEl] = useState<HTMLDivElement | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debouncedSearchValue = useDebounce(value, 300);

  const handleFilterClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleFilterClose = () => {
    setAnchorEl(null);
  };

  const handlePriceChange = (event: Event, newValue: number | number[]) => {
    setLocalFilters({
      ...localFilters,
      priceRange: newValue as [number, number],
    });
  };

  const handleTagToggle = (tag: string) => {
    const newTags = localFilters.tags.includes(tag)
      ? localFilters.tags.filter((t) => t !== tag)
      : [...localFilters.tags, tag];
    
    setLocalFilters({
      ...localFilters,
      tags: newTags,
    });
  };

  const handleVerifiedChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLocalFilters({
      ...localFilters,
      verified: event.target.checked,
    });
  };

  const applyFilters = () => {
    onFiltersChange(localFilters);
    handleFilterClose();
  };

  const resetFilters = () => {
    const defaultFilters: MarketplaceFilters = {
      priceRange: [0, 10000],
      tags: [],
      verified: false,
    };
    setLocalFilters(defaultFilters);
    onFiltersChange(defaultFilters);
  };

  useEffect(() => {
    if (debouncedSearchValue && onSearch) {
      setIsSearching(true);
      onSearch(debouncedSearchValue);
      setTimeout(() => setIsSearching(false), 1000);
    }
  }, [debouncedSearchValue, onSearch]);

  const handleSearchSubmit = (searchValue: string) => {
    onChange(searchValue);
    setShowSuggestions(false);
    if (onSearch) {
      onSearch(searchValue);
    }
  };

  const handleSearchFocus = () => {
    setShowSuggestions(true);
    setSearchAnchorEl(searchInputRef.current);
  };

  const handleSearchBlur = () => {
    // Delay to allow click on suggestions
    setTimeout(() => setShowSuggestions(false), 200);
  };

  const activeFiltersCount = 
    (localFilters.priceRange[0] > 0 || localFilters.priceRange[1] < 10000 ? 1 : 0) +
    localFilters.tags.length +
    (localFilters.verified ? 1 : 0) +
    (localFilters.category && localFilters.category !== 'All Categories' ? 1 : 0);

  const open = Boolean(anchorEl);
  const id = open ? 'filter-popover' : undefined;
  const searchOpen = Boolean(searchAnchorEl) && showSuggestions && (value.length > 0 || recentSearches.length > 0);

  return (
    <>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
        <Paper
          component="form"
          sx={{
            p: '2px 4px',
            display: 'flex',
            alignItems: 'center',
            flex: 1,
            position: 'relative',
          }}
          elevation={1}
          onSubmit={(e) => {
            e.preventDefault();
            handleSearchSubmit(value);
          }}
        >
          <IconButton sx={{ p: '10px' }} aria-label="search">
            {isSearching ? <CircularProgress size={20} /> : <SearchIcon />}
          </IconButton>
          <InputBase
            ref={searchInputRef}
            sx={{ ml: 1, flex: 1 }}
            placeholder="Search AI models, datasets, tools..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
            inputProps={{ 'aria-label': 'search marketplace' }}
          />
          {value && (
            <IconButton
              sx={{ p: '10px' }}
              aria-label="clear search"
              onClick={() => {
                onChange('');
                searchInputRef.current?.focus();
              }}
            >
              <ClearIcon />
            </IconButton>
          )}
          <Divider sx={{ height: 28, m: 0.5 }} orientation="vertical" />
          <IconButton
            sx={{ p: '10px' }}
            aria-label="filter"
            onClick={handleFilterClick}
            color={activeFiltersCount > 0 ? 'primary' : 'default'}
          >
            <Badge badgeContent={activeFiltersCount} color="primary">
              <FilterIcon />
            </Badge>
          </IconButton>
        </Paper>

        {/* Sort Dropdown */}
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <Select
            value={localFilters.sortBy || 'relevance'}
            onChange={(e) => {
              const newFilters = { ...localFilters, sortBy: e.target.value };
              setLocalFilters(newFilters);
              onFiltersChange(newFilters);
            }}
            displayEmpty
          >
            {sortOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* View Mode Toggle */}
        {onViewModeChange && (
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(e, newMode) => newMode && onViewModeChange(newMode)}
            size="small"
          >
            <ToggleButton value="grid" aria-label="grid view">
              <Tooltip title="Grid view">
                <GridIcon />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="list" aria-label="list view">
              <Tooltip title="List view">
                <ListIcon />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
        )}
      </Box>

      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleFilterClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <Box sx={{ p: 3, width: 320 }}>
          <Typography variant="h6" gutterBottom>
            Filters
          </Typography>

          {/* Price Range */}
          <Box sx={{ mb: 3 }}>
            <Typography gutterBottom>Price Range</Typography>
            <Slider
              value={localFilters.priceRange}
              onChange={handlePriceChange}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `$${value}`}
              min={0}
              max={10000}
              marks={[
                { value: 0, label: '$0' },
                { value: 5000, label: '$5k' },
                { value: 10000, label: '$10k+' },
              ]}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                ${localFilters.priceRange[0]}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ${localFilters.priceRange[1] === 10000 ? '10,000+' : localFilters.priceRange[1]}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Tags */}
          <Box sx={{ mb: 3 }}>
            <Typography gutterBottom>Tags</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {popularTags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  onClick={() => handleTagToggle(tag)}
                  color={localFilters.tags.includes(tag) ? 'primary' : 'default'}
                  variant={localFilters.tags.includes(tag) ? 'filled' : 'outlined'}
                  size="small"
                  sx={{ mb: 1 }}
                />
              ))}
            </Stack>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Category Filter */}
          <Box sx={{ mb: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Category</InputLabel>
              <Select
                value={localFilters.category || 'All Categories'}
                onChange={(e) => setLocalFilters({ ...localFilters, category: e.target.value })}
                label="Category"
              >
                {categories.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Other Filters */}
          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox
                  checked={localFilters.verified}
                  onChange={handleVerifiedChange}
                />
              }
              label="Verified sellers only"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={localFilters.hasReviews || false}
                  onChange={(e) => setLocalFilters({ ...localFilters, hasReviews: e.target.checked })}
                />
              }
              label="Has reviews"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={localFilters.freeOnly || false}
                  onChange={(e) => setLocalFilters({ ...localFilters, freeOnly: e.target.checked })}
                />
              }
              label="Free items only"
            />
          </FormGroup>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
            <Button
              variant="outlined"
              onClick={resetFilters}
              fullWidth
              disabled={activeFiltersCount === 0}
            >
              Reset
            </Button>
            <Button
              variant="contained"
              onClick={applyFilters}
              fullWidth
            >
              Apply Filters
            </Button>
          </Box>
        </Box>
      </Popover>

      {/* Search Suggestions Popover */}
      <Popover
        open={searchOpen}
        anchorEl={searchAnchorEl}
        onClose={() => setShowSuggestions(false)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        disableAutoFocus
        disableEnforceFocus
        PaperProps={{
          sx: {
            width: searchAnchorEl?.offsetWidth,
            maxHeight: 400,
            overflow: 'auto',
          },
        }}
      >
        <List dense>
          {/* Recent Searches */}
          {recentSearches.length > 0 && value.length === 0 && (
            <>
              <ListItem>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                  Recent Searches
                </Typography>
              </ListItem>
              {recentSearches.slice(0, 5).map((search, index) => (
                <ListItem
                  key={`recent-${index}`}
                  button
                  onClick={() => handleSearchSubmit(search)}
                >
                  <ListItemIcon>
                    <HistoryIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={search} />
                </ListItem>
              ))}
              <Divider />
            </>
          )}

          {/* Search Suggestions */}
          {value.length > 0 && suggestions.length > 0 && (
            <>
              <ListItem>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                  Suggestions
                </Typography>
              </ListItem>
              {suggestions.map((suggestion, index) => (
                <ListItem
                  key={`suggestion-${index}`}
                  button
                  onClick={() => handleSearchSubmit(suggestion)}
                >
                  <ListItemIcon>
                    <SearchIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary={suggestion}
                    primaryTypographyProps={{
                      sx: {
                        '& mark': {
                          backgroundColor: 'primary.light',
                          color: 'inherit',
                        },
                      },
                    }}
                  />
                </ListItem>
              ))}
            </>
          )}

          {/* Trending Searches */}
          <ListItem>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
              Trending
            </Typography>
          </ListItem>
          {['GPT-4 models', 'Image generation', 'Data analysis tools'].map((trend, index) => (
            <ListItem
              key={`trend-${index}`}
              button
              onClick={() => handleSearchSubmit(trend)}
            >
              <ListItemIcon>
                <TrendingIcon fontSize="small" color="primary" />
              </ListItemIcon>
              <ListItemText primary={trend} />
            </ListItem>
          ))}
        </List>
      </Popover>
    </>
  );
};

export default SearchBar;