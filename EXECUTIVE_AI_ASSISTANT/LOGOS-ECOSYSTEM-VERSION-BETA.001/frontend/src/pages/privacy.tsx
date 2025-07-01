import {
  Box,
  Container,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert
} from '@mui/material';
import { useRouter } from 'next/router';
import SEOHead from '../components/SEO/SEOHead';

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <>
      <SEOHead
        title="Privacy Policy - LOGOS ECOSYSTEM"
        description="Privacy policy for LOGOS ECOSYSTEM. Learn how we protect your data and respect your privacy."
        keywords="privacy policy, data protection, GDPR, privacy"
      />

      <Box sx={{ minHeight: '100vh', background: '#0a0a0a', color: 'white', py: 8 }}>
        <Container maxWidth="md">
          <Paper sx={{ p: 6, background: 'rgba(255,255,255,0.05)' }}>
            <Typography variant="h3" gutterBottom>
              Privacy Policy
            </Typography>
            
            <Typography variant="body2" sx={{ mb: 4, opacity: 0.7 }}>
              Last updated: January 2024
            </Typography>

            <Alert severity="info" sx={{ mb: 4 }}>
              At LOGOS ECOSYSTEM, we take your privacy seriously. This policy describes how we collect, 
              use, and protect your information.
            </Alert>

            <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
              1. Information We Collect
            </Typography>
            <Typography variant="body1" paragraph>
              We collect information you provide directly to us, such as:
            </Typography>
            <List sx={{ mb: 3 }}>
              <ListItem>
                <ListItemText primary="Account information (name, email, password)" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Payment information (processed securely through third-party providers)" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Communication preferences" />
              </ListItem>
              <ListItem>
                <ListItemText primary="AI agent interactions and conversation history" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Device and usage information" />
              </ListItem>
            </List>

            <Divider sx={{ my: 4 }} />

            <Typography variant="h5" gutterBottom>
              2. How We Use Your Information
            </Typography>
            <Typography variant="body1" paragraph>
              We use the information we collect to:
            </Typography>
            <List sx={{ mb: 3 }}>
              <ListItem>
                <ListItemText primary="Provide, maintain, and improve our services" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Process transactions and send related information" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Send technical notices and support messages" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Respond to your comments and questions" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Develop new features and services" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Prevent fraud and enhance security" />
              </ListItem>
            </List>

            <Divider sx={{ my: 4 }} />

            <Typography variant="h5" gutterBottom>
              3. Data Security
            </Typography>
            <Typography variant="body1" paragraph>
              We implement industry-standard security measures to protect your data:
            </Typography>
            <List sx={{ mb: 3 }}>
              <ListItem>
                <ListItemText primary="End-to-end encryption for all communications" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Regular security audits and penetration testing" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Secure data centers with redundancy" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Limited access to personal information" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Regular employee security training" />
              </ListItem>
            </List>

            <Divider sx={{ my: 4 }} />

            <Typography variant="h5" gutterBottom>
              4. AI and Machine Learning
            </Typography>
            <Typography variant="body1" paragraph>
              Our AI agents process your queries to provide responses. We:
            </Typography>
            <List sx={{ mb: 3 }}>
              <ListItem>
                <ListItemText primary="Do not use your personal conversations to train our models without consent" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Allow you to delete your conversation history at any time" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Provide options to opt-out of data collection for improvement" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Anonymize data used for general model improvements" />
              </ListItem>
            </List>

            <Divider sx={{ my: 4 }} />

            <Typography variant="h5" gutterBottom>
              5. Data Sharing
            </Typography>
            <Typography variant="body1" paragraph>
              We do not sell, trade, or rent your personal information. We may share information:
            </Typography>
            <List sx={{ mb: 3 }}>
              <ListItem>
                <ListItemText primary="With your consent" />
              </ListItem>
              <ListItem>
                <ListItemText primary="To comply with legal obligations" />
              </ListItem>
              <ListItem>
                <ListItemText primary="To protect rights, privacy, safety, or property" />
              </ListItem>
              <ListItem>
                <ListItemText primary="With service providers who assist our operations" />
              </ListItem>
            </List>

            <Divider sx={{ my: 4 }} />

            <Typography variant="h5" gutterBottom>
              6. Your Rights
            </Typography>
            <Typography variant="body1" paragraph>
              You have the right to:
            </Typography>
            <List sx={{ mb: 3 }}>
              <ListItem>
                <ListItemText primary="Access your personal information" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Correct inaccurate data" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Request deletion of your data" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Export your data in a portable format" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Opt-out of marketing communications" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Restrict processing of your data" />
              </ListItem>
            </List>

            <Divider sx={{ my: 4 }} />

            <Typography variant="h5" gutterBottom>
              7. Cookies and Tracking
            </Typography>
            <Typography variant="body1" paragraph>
              We use cookies and similar technologies to:
            </Typography>
            <List sx={{ mb: 3 }}>
              <ListItem>
                <ListItemText primary="Maintain your session and preferences" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Analyze usage patterns and improve services" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Provide personalized experiences" />
              </ListItem>
            </List>
            <Typography variant="body1" paragraph>
              You can control cookies through your browser settings.
            </Typography>

            <Divider sx={{ my: 4 }} />

            <Typography variant="h5" gutterBottom>
              8. International Data Transfers
            </Typography>
            <Typography variant="body1" paragraph>
              Your information may be transferred to and processed in countries other than your own. 
              We ensure appropriate safeguards are in place to protect your information in accordance 
              with this privacy policy.
            </Typography>

            <Divider sx={{ my: 4 }} />

            <Typography variant="h5" gutterBottom>
              9. Children's Privacy
            </Typography>
            <Typography variant="body1" paragraph>
              Our services are not directed to individuals under 13. We do not knowingly collect 
              personal information from children under 13. If we become aware of such collection, 
              we will delete the information.
            </Typography>

            <Divider sx={{ my: 4 }} />

            <Typography variant="h5" gutterBottom>
              10. Changes to This Policy
            </Typography>
            <Typography variant="body1" paragraph>
              We may update this privacy policy from time to time. We will notify you of any changes 
              by posting the new policy on this page and updating the "Last updated" date.
            </Typography>

            <Divider sx={{ my: 4 }} />

            <Typography variant="h5" gutterBottom>
              11. Contact Us
            </Typography>
            <Typography variant="body1" paragraph>
              If you have questions about this privacy policy or our practices, please contact us at:
            </Typography>
            <Typography variant="body1" component="div" sx={{ ml: 2 }}>
              Email: privacy@logos-ecosystem.ai<br />
              Address: LOGOS ECOSYSTEM Inc.<br />
              123 AI Boulevard<br />
              San Francisco, CA 94105<br />
              United States
            </Typography>
          </Paper>
        </Container>
      </Box>
    </>
  );
}