import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  LinearProgress,
  Tabs,
  Tab,
  Divider,
  Avatar,
  Tooltip
} from '@mui/material';
import {
  AccountBalanceWallet,
  Add,
  Remove,
  Send,
  GetApp,
  History,
  CreditCard,
  TrendingUp,
  TrendingDown,
  SwapHoriz,
  Security,
  ContentCopy,
  QrCode,
  Info
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import SEOHead from '../../components/SEO/SEOHead';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface WalletBalance {
  currency: string;
  symbol: string;
  balance: number;
  usd_value: number;
  change_24h: number;
  icon?: string;
}

interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'purchase' | 'sale' | 'transfer';
  amount: number;
  currency: string;
  description: string;
  status: 'pending' | 'completed' | 'failed';
  timestamp: string;
  to_address?: string;
  from_address?: string;
  tx_hash?: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function WalletPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [balances, setBalances] = useState<WalletBalance[]>([
    { currency: 'USD', symbol: '$', balance: 1000.00, usd_value: 1000.00, change_24h: 0 },
    { currency: 'BTC', symbol: '₿', balance: 0.025, usd_value: 1125.50, change_24h: 2.5 },
    { currency: 'ETH', symbol: 'Ξ', balance: 0.5, usd_value: 950.00, change_24h: -1.2 },
    { currency: 'USDT', symbol: '₮', balance: 500.00, usd_value: 500.00, change_24h: 0 },
  ]);
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: '1',
      type: 'purchase',
      amount: -50.00,
      currency: 'USD',
      description: 'Medical AI Agent - Monthly',
      status: 'completed',
      timestamp: new Date().toISOString(),
    },
    {
      id: '2',
      type: 'deposit',
      amount: 100.00,
      currency: 'USD',
      description: 'Bank Transfer',
      status: 'completed',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
    },
  ]);
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [walletAddress, setWalletAddress] = useState('0x1234...5678');

  const totalUsdValue = balances.reduce((sum, balance) => sum + balance.usd_value, 0);

  const handleDeposit = (amount: number, currency: string, method: string) => {
    // Handle deposit logic
    const newTransaction: Transaction = {
      id: Date.now().toString(),
      type: 'deposit',
      amount,
      currency,
      description: `Deposit via ${method}`,
      status: 'pending',
      timestamp: new Date().toISOString(),
    };
    setTransactions(prev => [newTransaction, ...prev]);
    setDepositDialogOpen(false);
  };

  const handleWithdraw = (amount: number, currency: string, address: string) => {
    // Handle withdrawal logic
    const newTransaction: Transaction = {
      id: Date.now().toString(),
      type: 'withdrawal',
      amount: -amount,
      currency,
      description: `Withdrawal to ${address}`,
      status: 'pending',
      timestamp: new Date().toISOString(),
      to_address: address,
    };
    setTransactions(prev => [newTransaction, ...prev]);
    setWithdrawDialogOpen(false);
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <GetApp color="success" />;
      case 'withdrawal':
        return <Send color="error" />;
      case 'purchase':
        return <Remove color="error" />;
      case 'sale':
        return <Add color="success" />;
      case 'transfer':
        return <SwapHoriz color="primary" />;
      default:
        return <History />;
    }
  };

  return (
    <DashboardLayout>
      <SEOHead
        title="Wallet - LOGOS ECOSYSTEM"
        description="Manage your multi-currency wallet for AI agent purchases and transactions"
        keywords="crypto wallet, AI payments, multi-currency wallet"
      />

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4">Wallet</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setDepositDialogOpen(true)}
            >
              Deposit
            </Button>
            <Button
              variant="outlined"
              startIcon={<Send />}
              onClick={() => setWithdrawDialogOpen(true)}
            >
              Withdraw
            </Button>
          </Box>
        </Box>

        {/* Total Balance Card */}
        <Card sx={{ mb: 4, background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', color: 'white' }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" sx={{ opacity: 0.8, mb: 1 }}>
              Total Balance
            </Typography>
            <Typography variant="h3" sx={{ mb: 2 }}>
              ${totalUsdValue.toFixed(2)}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip
                label="Verified Account"
                icon={<Security />}
                color="success"
                size="small"
                sx={{ background: 'rgba(255,255,255,0.2)' }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Wallet Address:
                </Typography>
                <Chip
                  label={walletAddress}
                  size="small"
                  onDelete={copyAddress}
                  deleteIcon={<ContentCopy />}
                  sx={{ background: 'rgba(255,255,255,0.1)' }}
                />
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Currency Balances */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {balances.map((balance) => (
            <Grid item xs={12} sm={6} md={3} key={balance.currency}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                      <Typography variant="h6">
                        {balance.currency}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {balance.symbol}{balance.balance.toFixed(balance.currency === 'BTC' ? 8 : 2)}
                      </Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      {balance.symbol}
                    </Avatar>
                  </Box>
                  <Typography variant="h6">
                    ${balance.usd_value.toFixed(2)}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {balance.change_24h > 0 ? (
                      <TrendingUp color="success" fontSize="small" />
                    ) : balance.change_24h < 0 ? (
                      <TrendingDown color="error" fontSize="small" />
                    ) : null}
                    <Typography
                      variant="body2"
                      color={balance.change_24h > 0 ? 'success.main' : balance.change_24h < 0 ? 'error.main' : 'text.secondary'}
                    >
                      {balance.change_24h > 0 ? '+' : ''}{balance.change_24h}%
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
            <Tab label="Transactions" />
            <Tab label="Payment Methods" />
            <Tab label="Security" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <List>
            {transactions.map((transaction) => (
              <ListItem key={transaction.id} divider>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      {getTransactionIcon(transaction.type)}
                      <Box>
                        <Typography variant="body1">
                          {transaction.description}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(transaction.timestamp).toLocaleString()}
                        </Typography>
                      </Box>
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography
                      variant="body1"
                      color={transaction.amount > 0 ? 'success.main' : 'error.main'}
                    >
                      {transaction.amount > 0 ? '+' : ''}{transaction.amount.toFixed(2)} {transaction.currency}
                    </Typography>
                    <Chip
                      label={transaction.status}
                      size="small"
                      color={transaction.status === 'completed' ? 'success' : transaction.status === 'failed' ? 'error' : 'default'}
                    />
                  </Box>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Bank Account
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        <CreditCard />
                      </ListItemIcon>
                      <ListItemText
                        primary="Chase Bank ****1234"
                        secondary="Primary account"
                      />
                      <ListItemSecondaryAction>
                        <Chip label="Verified" color="success" size="small" />
                      </ListItemSecondaryAction>
                    </ListItem>
                  </List>
                  <Button variant="outlined" fullWidth sx={{ mt: 2 }}>
                    Add Bank Account
                  </Button>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Credit/Debit Cards
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        <CreditCard />
                      </ListItemIcon>
                      <ListItemText
                        primary="Visa ****5678"
                        secondary="Expires 12/25"
                      />
                      <ListItemSecondaryAction>
                        <IconButton size="small">
                          <Remove />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  </List>
                  <Button variant="outlined" fullWidth sx={{ mt: 2 }}>
                    Add Card
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Two-Factor Authentication
                  </Typography>
                  <Alert severity="success" sx={{ mb: 2 }}>
                    2FA is enabled for your account
                  </Alert>
                  <Button variant="outlined" fullWidth>
                    Manage 2FA Settings
                  </Button>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Withdrawal Whitelist
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Only allow withdrawals to pre-approved addresses
                  </Typography>
                  <Button variant="outlined" fullWidth>
                    Manage Whitelist
                  </Button>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    API Keys
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Manage API access for automated trading and integrations
                  </Typography>
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    Keep your API keys secure and never share them
                  </Alert>
                  <Button variant="outlined">
                    Generate API Key
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Container>

      {/* Deposit Dialog */}
      <Dialog open={depositDialogOpen} onClose={() => setDepositDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Deposit Funds</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Currency</InputLabel>
              <Select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                label="Currency"
              >
                {balances.map((balance) => (
                  <MenuItem key={balance.currency} value={balance.currency}>
                    {balance.currency}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              type="number"
              label="Amount"
              margin="normal"
              InputProps={{
                startAdornment: balances.find(b => b.currency === selectedCurrency)?.symbol,
              }}
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Payment Method</InputLabel>
              <Select defaultValue="bank" label="Payment Method">
                <MenuItem value="bank">Bank Transfer</MenuItem>
                <MenuItem value="card">Credit/Debit Card</MenuItem>
                <MenuItem value="crypto">Crypto Transfer</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDepositDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => handleDeposit(100, selectedCurrency, 'Bank Transfer')}
          >
            Deposit
          </Button>
        </DialogActions>
      </Dialog>

      {/* Withdraw Dialog */}
      <Dialog open={withdrawDialogOpen} onClose={() => setWithdrawDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Withdraw Funds</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Currency</InputLabel>
              <Select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                label="Currency"
              >
                {balances.map((balance) => (
                  <MenuItem key={balance.currency} value={balance.currency}>
                    {balance.currency} - {balance.symbol}{balance.balance}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              type="number"
              label="Amount"
              margin="normal"
              InputProps={{
                startAdornment: balances.find(b => b.currency === selectedCurrency)?.symbol,
              }}
            />
            <TextField
              fullWidth
              label="Destination Address"
              margin="normal"
              placeholder="Bank account or crypto address"
            />
            <Alert severity="info" sx={{ mt: 2 }}>
              Withdrawal will be processed within 1-2 business days
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWithdrawDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => handleWithdraw(50, selectedCurrency, '0xabcd...1234')}
          >
            Withdraw
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
}