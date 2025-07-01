import React, { useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Collapse,
  Divider,
  Chip,
  Skeleton,
  Paper,
} from '@mui/material';
import {
  ExpandLess,
  ExpandMore,
  Category as CategoryIcon,
  Code as CodeIcon,
  Brush as BrushIcon,
  Movie as MovieIcon,
  MusicNote as MusicIcon,
  School as SchoolIcon,
  Games as GamesIcon,
  Business as BusinessIcon,
  Psychology as PsychologyIcon,
  Storage as StorageIcon,
  Security as SecurityIcon,
  Analytics as AnalyticsIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { marketplaceApi } from '../../services/api/marketplace';

interface Category {
  id: string;
  name: string;
  icon: React.ReactElement;
  count?: number;
  subcategories?: Category[];
}

interface CategoryFilterProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

const categoryIcons: Record<string, React.ReactElement> = {
  'all': <CategoryIcon />,
  'development': <CodeIcon />,
  'ai-models': <PsychologyIcon />,
  'design': <BrushIcon />,
  'media': <MovieIcon />,
  'music': <MusicIcon />,
  'education': <SchoolIcon />,
  'gaming': <GamesIcon />,
  'business': <BusinessIcon />,
  'data': <StorageIcon />,
  'security': <SecurityIcon />,
  'analytics': <AnalyticsIcon />,
};

const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategory,
  onCategoryChange,
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const { data: categories, isPending } = useQuery({
    queryKey: ['marketplace-categories'],
    queryFn: marketplaceApi.getCategories,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const handleCategoryClick = (categoryId: string, hasSubcategories: boolean) => {
    if (hasSubcategories) {
      setExpandedCategories((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(categoryId)) {
          newSet.delete(categoryId);
        } else {
          newSet.add(categoryId);
        }
        return newSet;
      });
    } else {
      onCategoryChange(categoryId);
    }
  };

  const renderCategory = (category: Category, level: number = 0) => {
    const isExpanded = expandedCategories.has(category.id);
    const isSelected = selectedCategory === category.id;
    const hasSubcategories = category.subcategories && category.subcategories.length > 0;

    return (
      <React.Fragment key={category.id}>
        <ListItemButton
          selected={isSelected}
          onClick={() => handleCategoryClick(category.id, !!hasSubcategories)}
          sx={{
            pl: 2 + level * 2,
            borderRadius: 1,
            mb: 0.5,
            '&.Mui-selected': {
              backgroundColor: 'primary.light',
              '&:hover': {
                backgroundColor: 'primary.light',
              },
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>
            {categoryIcons[category.id] || <CategoryIcon />}
          </ListItemIcon>
          <ListItemText
            primary={category.name}
            secondary={category.count !== undefined ? `${category.count} items` : undefined}
          />
          {category.count !== undefined && category.count > 0 && (
            <Chip
              label={category.count}
              size="small"
              sx={{ ml: 1 }}
              color={isSelected ? 'primary' : 'default'}
            />
          )}
          {hasSubcategories && (isExpanded ? <ExpandLess /> : <ExpandMore />)}
        </ListItemButton>
        {hasSubcategories && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {category.subcategories!.map((subcategory) =>
                renderCategory(subcategory, level + 1)
              )}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  if (isPending) {
    return (
      <Paper elevation={1} sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Categories
        </Typography>
        <Divider sx={{ mb: 2 }} />
        {[...Array(6)].map((_, index) => (
          <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Skeleton variant="circular" width={24} height={24} sx={{ mr: 2 }} />
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="rectangular" width={40} height={20} sx={{ ml: 'auto' }} />
          </Box>
        ))}
      </Paper>
    );
  }

  const allCategory: Category = {
    id: 'all',
    name: 'All Categories',
    icon: <CategoryIcon />,
    count: categories?.reduce((sum, cat) => sum + (cat.count || 0), 0),
  };

  return (
    <Paper elevation={1} sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Categories
      </Typography>
      <Divider sx={{ mb: 2 }} />
      <List component="nav" aria-label="marketplace categories" sx={{ p: 0 }}>
        {renderCategory(allCategory)}
        <Divider sx={{ my: 1 }} />
        {categories?.map((category) => renderCategory(category))}
      </List>
    </Paper>
  );
};

export default CategoryFilter;