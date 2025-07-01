import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
  Tooltip,
  CircularProgress,
  Alert,
  InputAdornment
} from '@mui/material';
import {
  Search,
  FilterList,
  Download,
  Refresh,
  Info,
  CheckCircle,
  Error,
  Person,
  Event,
  Security,
  Assessment
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { api } from '../../services/api';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';

interface AuditLog {
  id: string;
  userId: string | null;
  user: {
    id: string;
    email: string;
    username: string;
  } | null;
  action: string;
  entity: string;
  entityId: string | null;
  changes: any;
  ipAddress: string | null;
  userAgent: string | null;
  success: boolean;
  errorMessage: string | null;
  createdAt: string;
}

interface AuditLogFilters {
  userId?: string;
  action?: string;
  entity?: string;
  entityId?: string;
  success?: boolean;
  startDate?: Date | null;
  endDate?: Date | null;
}

interface Statistics {
  totalLogs: number;
  failedActions: number;
  successRate: string;
  topActions: { action: string; count: number }[];
  topUsers: { userId: string; count: number }[];
}

const AuditLogViewer: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, [page, rowsPerPage, filters]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(rowsPerPage),
        offset: String(page * rowsPerPage),
        ...Object.entries(filters).reduce((acc, [key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            if (key === 'startDate' || key === 'endDate') {
              acc[key] = (value as Date).toISOString();
            } else {
              acc[key] = String(value);
            }
          }
          return acc;
        }, {} as Record<string, string>)
      });

      const response = await api.get(`/audit-logs?${params}`);
      setLogs(response.data.data.logs);
      setTotal(response.data.data.total);
    } catch (error: any) {
      enqueueSnackbar('Failed to fetch audit logs', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await api.get('/audit-logs/statistics');
      setStatistics(response.data.data.statistics);
      setShowStats(true);
    } catch (error: any) {
      enqueueSnackbar('Failed to fetch statistics', { variant: 'error' });
    }
  };

  const exportLogs = async () => {
    try {
      const params = new URLSearchParams(
        Object.entries(filters).reduce((acc, [key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            if (key === 'startDate' || key === 'endDate') {
              acc[key] = (value as Date).toISOString();
            } else {
              acc[key] = String(value);
            }
          }
          return acc;
        }, {} as Record<string, string>)
      );

      const response = await api.get(`/audit-logs/export?${params}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      enqueueSnackbar('Audit logs exported successfully', { variant: 'success' });
    } catch (error: any) {
      enqueueSnackbar('Failed to export audit logs', { variant: 'error' });
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getActionColor = (action: string): 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'success' | 'info' => {
    if (action.includes('LOGIN')) return 'primary';
    if (action.includes('CREATE') || action.includes('ADD')) return 'success';
    if (action.includes('UPDATE') || action.includes('EDIT')) return 'info';
    if (action.includes('DELETE') || action.includes('REMOVE')) return 'error';
    if (action.includes('FAILED')) return 'error';
    return 'default';
  };

  const getEntityIcon = (entity: string) => {
    switch (entity) {
      case 'User':
        return <Person fontSize="small" />;
      case 'Product':
        return <Assessment fontSize="small" />;
      case 'AuditLog':
        return <Security fontSize="small" />;
      default:
        return <Info fontSize="small" />;
    }
  };

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5">Audit Logs</Typography>
          <Box display="flex" gap={1}>
            <Button
              startIcon={<Assessment />}
              onClick={fetchStatistics}
              variant="outlined"
            >
              Statistics
            </Button>
            <Button
              startIcon={<FilterList />}
              onClick={() => setShowFilters(!showFilters)}
              variant="outlined"
            >
              Filters
            </Button>
            <Button
              startIcon={<Download />}
              onClick={exportLogs}
              variant="outlined"
            >
              Export
            </Button>
            <IconButton onClick={fetchLogs} disabled={loading}>
              <Refresh />
            </IconButton>
          </Box>
        </Box>

        {showFilters && (
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="User ID"
                  value={filters.userId || ''}
                  onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Action"
                  value={filters.action || ''}
                  onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Entity</InputLabel>
                  <Select
                    value={filters.entity || ''}
                    onChange={(e) => setFilters({ ...filters, entity: e.target.value })}
                    label="Entity"
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="User">User</MenuItem>
                    <MenuItem value="Product">Product</MenuItem>
                    <MenuItem value="Subscription">Subscription</MenuItem>
                    <MenuItem value="SupportTicket">Support Ticket</MenuItem>
                    <MenuItem value="ApiKey">API Key</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Success</InputLabel>
                  <Select
                    value={filters.success !== undefined ? String(filters.success) : ''}
                    onChange={(e) => setFilters({ 
                      ...filters, 
                      success: e.target.value === '' ? undefined : e.target.value === 'true' 
                    })}
                    label="Success"
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="true">Success</MenuItem>
                    <MenuItem value="false">Failed</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Start Date"
                    value={filters.startDate || null}
                    onChange={(date) => setFilters({ ...filters, startDate: date })}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="End Date"
                    value={filters.endDate || null}
                    onChange={(date) => setFilters({ ...filters, endDate: date })}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12}>
                <Box display="flex" gap={1}>
                  <Button
                    onClick={() => {
                      setFilters({});
                      setPage(0);
                    }}
                    variant="text"
                  >
                    Clear Filters
                  </Button>
                  <Button
                    onClick={() => {
                      setPage(0);
                      fetchLogs();
                    }}
                    variant="contained"
                    color="primary"
                  >
                    Apply Filters
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date/Time</TableCell>
                    <TableCell>User</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>Entity</TableCell>
                    <TableCell>IP Address</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} hover>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Event fontSize="small" color="action" />
                          <Typography variant="body2">
                            {format(new Date(log.createdAt), 'MMM dd, yyyy HH:mm:ss')}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {log.user ? (
                          <Tooltip title={`ID: ${log.user.id}`}>
                            <Typography variant="body2">
                              {log.user.email}
                            </Typography>
                          </Tooltip>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            System
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={log.action}
                          size="small"
                          color={getActionColor(log.action)}
                        />
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={0.5}>
                          {getEntityIcon(log.entity)}
                          <Typography variant="body2">
                            {log.entity}
                            {log.entityId && (
                              <Typography variant="caption" color="text.secondary" component="span">
                                {' '}({log.entityId.substring(0, 8)}...)
                              </Typography>
                            )}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {log.ipAddress || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {log.success ? (
                          <CheckCircle color="success" fontSize="small" />
                        ) : (
                          <Tooltip title={log.errorMessage || 'Failed'}>
                            <Error color="error" fontSize="small" />
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedLog(log);
                            setShowDetails(true);
                          }}
                        >
                          <Info />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[10, 25, 50, 100]}
            />
          </>
        )}
      </Paper>

      {/* Log Details Dialog */}
      <Dialog open={showDetails} onClose={() => setShowDetails(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Audit Log Details
          <Chip
            label={selectedLog?.action || ''}
            size="small"
            color={selectedLog ? getActionColor(selectedLog.action) : 'default'}
            sx={{ ml: 2 }}
          />
        </DialogTitle>
        <DialogContent>
          {selectedLog && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Date/Time
                </Typography>
                <Typography variant="body1">
                  {format(new Date(selectedLog.createdAt), 'MMM dd, yyyy HH:mm:ss')}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  User
                </Typography>
                <Typography variant="body1">
                  {selectedLog.user ? selectedLog.user.email : 'System'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Entity
                </Typography>
                <Typography variant="body1">
                  {selectedLog.entity} {selectedLog.entityId && `(${selectedLog.entityId})`}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  IP Address
                </Typography>
                <Typography variant="body1">
                  {selectedLog.ipAddress || '-'}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  User Agent
                </Typography>
                <Typography variant="body1" sx={{ wordBreak: 'break-word' }}>
                  {selectedLog.userAgent || '-'}
                </Typography>
              </Grid>
              {selectedLog.errorMessage && (
                <Grid item xs={12}>
                  <Alert severity="error">
                    <Typography variant="subtitle2">Error Message</Typography>
                    <Typography variant="body2">{selectedLog.errorMessage}</Typography>
                  </Alert>
                </Grid>
              )}
              {selectedLog.changes && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Changes
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
                    <pre style={{ margin: 0, overflow: 'auto' }}>
                      {JSON.stringify(selectedLog.changes, null, 2)}
                    </pre>
                  </Paper>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetails(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Statistics Dialog */}
      <Dialog open={showStats} onClose={() => setShowStats(false)} maxWidth="md" fullWidth>
        <DialogTitle>Audit Log Statistics (Last 7 Days)</DialogTitle>
        <DialogContent>
          {statistics && (
            <Grid container spacing={3}>
              <Grid item xs={12} sm={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h4" color="primary">
                      {statistics.totalLogs.toLocaleString()}
                    </Typography>
                    <Typography variant="subtitle2" color="text.secondary">
                      Total Logs
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h4" color="error">
                      {statistics.failedActions.toLocaleString()}
                    </Typography>
                    <Typography variant="subtitle2" color="text.secondary">
                      Failed Actions
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h4" color="success.main">
                      {statistics.successRate}
                    </Typography>
                    <Typography variant="subtitle2" color="text.secondary">
                      Success Rate
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Top Actions
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Action</TableCell>
                        <TableCell align="right">Count</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {statistics.topActions.map((action) => (
                        <TableRow key={action.action}>
                          <TableCell>
                            <Chip
                              label={action.action}
                              size="small"
                              color={getActionColor(action.action)}
                            />
                          </TableCell>
                          <TableCell align="right">{action.count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Most Active Users
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>User ID</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {statistics.topUsers.map((user) => (
                        <TableRow key={user.userId}>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                              {user.userId.substring(0, 8)}...
                            </Typography>
                          </TableCell>
                          <TableCell align="right">{user.count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowStats(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AuditLogViewer;