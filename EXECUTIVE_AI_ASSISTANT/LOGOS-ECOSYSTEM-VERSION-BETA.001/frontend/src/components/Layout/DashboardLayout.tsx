import React, { useState } from 'react'
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  useTheme,
  useMediaQuery,
  Collapse,
} from '@mui/material'
import {
  Menu as MenuIcon,
  Dashboard,
  ShoppingBag,
  AccountBalanceWallet,
  Chat,
  Settings,
  Logout,
  Person,
  Notifications,
  ExpandLess,
  ExpandMore,
  Store,
  Inventory,
  Analytics,
  Support,
} from '@mui/icons-material'
import { useRouter } from 'next/router'
import { useAuthStore } from '@/store/auth'
import Link from 'next/link'

interface DashboardLayoutProps {
  children: React.ReactNode
}

const drawerWidth = 240

const menuItems = [
  {
    title: 'Dashboard',
    icon: <Dashboard />,
    path: '/dashboard',
  },
  {
    title: 'Marketplace',
    icon: <Store />,
    subItems: [
      { title: 'Browse', path: '/marketplace' },
      { title: 'My Items', path: '/dashboard/items' },
      { title: 'Purchases', path: '/dashboard/purchases' },
      { title: 'Sales', path: '/dashboard/sales' },
    ],
  },
  {
    title: 'AI Assistant',
    icon: <Chat />,
    path: '/dashboard/ai-chat',
  },
  {
    title: 'Wallet',
    icon: <AccountBalanceWallet />,
    path: '/dashboard/wallet',
  },
  {
    title: 'Analytics',
    icon: <Analytics />,
    path: '/dashboard/analytics',
  },
  {
    title: 'Settings',
    icon: <Settings />,
    path: '/dashboard/settings',
  },
]

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const router = useRouter()
  const { user, logout } = useAuthStore()
  
  const [mobileOpen, setMobileOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const [notificationAnchor, setNotificationAnchor] = useState<null | HTMLElement>(null)

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleProfileMenuClose = () => {
    setAnchorEl(null)
  }

  const handleNotificationMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchor(event.currentTarget)
  }

  const handleNotificationMenuClose = () => {
    setNotificationAnchor(null)
  }

  const handleLogout = () => {
    logout()
    router.push('/auth/signin')
  }

  const handleExpandClick = (title: string) => {
    setExpandedItems(prev =>
      prev.includes(title)
        ? prev.filter(item => item !== title)
        : [...prev, title]
    )
  }

  const isActive = (path: string) => {
    return router.pathname === path
  }

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          LOGOS
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <React.Fragment key={item.title}>
            {item.subItems ? (
              <>
                <ListItemButton onClick={() => handleExpandClick(item.title)}>
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.title} />
                  {expandedItems.includes(item.title) ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
                <Collapse in={expandedItems.includes(item.title)} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {item.subItems.map((subItem) => (
                      <Link href={subItem.path} key={subItem.path} passHref>
                        <ListItemButton
                          sx={{ pl: 4 }}
                          selected={isActive(subItem.path)}
                        >
                          <ListItemText primary={subItem.title} />
                        </ListItemButton>
                      </Link>
                    ))}
                  </List>
                </Collapse>
              </>
            ) : (
              <Link href={item.path} key={item.path} passHref>
                <ListItemButton selected={isActive(item.path)}>
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.title} />
                </ListItemButton>
              </Link>
            )}
          </React.Fragment>
        ))}
      </List>
      <Divider />
      <List>
        <ListItem>
          <ListItemIcon>
            <Support />
          </ListItemIcon>
          <ListItemText primary="Support" />
        </ListItem>
      </List>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {menuItems.find(item => item.path === router.pathname)?.title || 'Dashboard'}
          </Typography>

          <IconButton
            color="inherit"
            onClick={handleNotificationMenuOpen}
            sx={{ mr: 2 }}
          >
            <Badge badgeContent={3} color="error">
              <Notifications />
            </Badge>
          </IconButton>

          <IconButton
            onClick={handleProfileMenuOpen}
            size="small"
            sx={{ ml: 2 }}
          >
            <Avatar sx={{ width: 32, height: 32 }}>
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </Avatar>
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant={isMobile ? 'temporary' : 'permanent'}
          open={isMobile ? mobileOpen : true}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
        }}
      >
        {children}
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => router.push('/dashboard/profile')}>
          <ListItemIcon>
            <Person fontSize="small" />
          </ListItemIcon>
          Profile
        </MenuItem>
        <MenuItem onClick={() => router.push('/dashboard/settings')}>
          <ListItemIcon>
            <Settings fontSize="small" />
          </ListItemIcon>
          Settings
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <Logout fontSize="small" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>

      <Menu
        anchorEl={notificationAnchor}
        open={Boolean(notificationAnchor)}
        onClose={handleNotificationMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          sx: { width: 320, maxHeight: 400 }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6">Notifications</Typography>
        </Box>
        <Divider />
        <MenuItem>
          <ListItemText
            primary="New purchase"
            secondary="John Doe purchased your AI Model"
          />
        </MenuItem>
        <MenuItem>
          <ListItemText
            primary="Wallet deposit"
            secondary="$50.00 has been added to your wallet"
          />
        </MenuItem>
        <MenuItem>
          <ListItemText
            primary="New message"
            secondary="You have a new message from support"
          />
        </MenuItem>
        <Divider />
        <MenuItem sx={{ justifyContent: 'center' }}>
          <Typography variant="body2" color="primary">
            View all notifications
          </Typography>
        </MenuItem>
      </Menu>
    </Box>
  )
}