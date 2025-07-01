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

export default function TermsPage() {
  const router = useRouter();

  return (
    <>
      <SEOHead
        title="Terms of Service - LOGOS ECOSYSTEM"
        description="Terms of Service for LOGOS ECOSYSTEM. Read our terms and conditions."
        keywords="terms of service, legal, terms and conditions"
      />

      <Box sx={{ minHeight: '100vh', background: '#0a0a0a', color: 'white', py: 8 }}>
        <Container maxWidth="md">
          <Paper sx={{ p: 6, background: 'rgba(255,255,255,0.05)' }}>
            <Typography variant="h3" gutterBottom>
              Terms of Service
            </Typography>
            
            <Typography variant="body2" sx={{ mb: 4, opacity: 0.7 }}>
              Effective Date: January 2024
            </Typography>

            <Alert severity="warning" sx={{ mb: 4 }}>
              By using LOGOS ECOSYSTEM, you agree to these terms. Please read them carefully.
            </Alert>

            <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
              1. Acceptance of Terms
            </Typography>
            <Typography variant="body1" paragraph>
              By accessing or using LOGOS ECOSYSTEM ("Service"), you agree to be bound by these 
              Terms of Service ("Terms"). If you disagree with any part of these terms, you may 
              not access the Service.
            </Typography>

            <Divider sx={{ my: 4 }} />

            <Typography variant="h5" gutterBottom>
              2. Description of Service
            </Typography>
            <Typography variant="body1" paragraph>
              LOGOS ECOSYSTEM provides:
            </Typography>
            <List sx={{ mb: 3 }}>
              <ListItem>
                <ListItemText primary="Access to specialized AI agents across various domains" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Voice and text interaction capabilities" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Integration with IoT devices and automotive systems" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Marketplace for AI agents and solutions" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Developer APIs and SDKs" />
              </ListItem>
              <ListItem>
                <ListItemText primary="White-label solutions for businesses" />
              </ListItem>
            </List>

            <Divider sx={{ my: 4 }} />

            <Typography variant="h5" gutterBottom>
              3. Account Registration
            </Typography>
            <Typography variant="body1" paragraph>
              To use certain features, you must register for an account. You agree to:
            </Typography>
            <List sx={{ mb: 3 }}>
              <ListItem>
                <ListItemText primary="Provide accurate and complete information" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Maintain the security of your account credentials" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Promptly update any changes to your information" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Accept responsibility for all activities under your account" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Notify us immediately of any unauthorized use" />
              </ListItem>
            </List>

            <Divider sx={{ my: 4 }} />

            <Typography variant="h5" gutterBottom>
              4. Acceptable Use Policy
            </Typography>
            <Typography variant="body1" paragraph>
              You agree NOT to use the Service to:
            </Typography>
            <List sx={{ mb: 3 }}>
              <ListItem>
                <ListItemText primary="Violate any laws or regulations" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Infringe on intellectual property rights" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Transmit malware or harmful code" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Harass, abuse, or harm others" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Attempt to gain unauthorized access" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Use the Service for illegal or unethical purposes" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Reverse engineer or copy our technology" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Exceed usage limits or abuse the Service" />
              </ListItem>
            </List>

            <Divider sx={{ my: 4 }} />

            <Typography variant="h5" gutterBottom>
              5. AI Agent Usage
            </Typography>
            <Typography variant="body1" paragraph>
              When using AI agents:
            </Typography>
            <List sx={{ mb: 3 }}>
              <ListItem>
                <ListItemText primary="AI responses are provided as-is without guarantees" />
              </ListItem>
              <ListItem>
                <ListItemText primary="You are responsible for verifying critical information" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Medical, legal, and financial advice should be verified with professionals" />
              </ListItem>
              <ListItem>
                <ListItemText primary="AI agents may have limitations and biases" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Usage is subject to fair use policies and rate limits" />
              </ListItem>
            </List>

            <Divider sx={{ my: 4 }} />

            <Typography variant="h5" gutterBottom>
              6. Marketplace Terms
            </Typography>
            <Typography variant="body1" paragraph>
              For marketplace transactions:
            </Typography>
            <List sx={{ mb: 3 }}>
              <ListItem>
                <ListItemText primary="All purchases are final unless otherwise stated" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Sellers must provide accurate descriptions" />
              </ListItem>
              <ListItem>
                <ListItemText primary="We facilitate but are not party to transactions" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Disputes should be resolved between parties" />
              </ListItem>
              <ListItem>
                <ListItemText primary="We may charge fees for marketplace services" />
              </ListItem>
            </List>

            <Divider sx={{ my: 4 }} />

            <Typography variant="h5" gutterBottom>
              7. Payment Terms
            </Typography>
            <Typography variant="body1" paragraph>
              For paid services:
            </Typography>
            <List sx={{ mb: 3 }}>
              <ListItem>
                <ListItemText primary="Subscription fees are billed in advance" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Prices may change with 30 days notice" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Refunds are provided per our refund policy" />
              </ListItem>
              <ListItem>
                <ListItemText primary="You are responsible for applicable taxes" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Failed payments may result in service suspension" />
              </ListItem>
            </List>

            <Divider sx={{ my: 4 }} />

            <Typography variant="h5" gutterBottom>
              8. Intellectual Property
            </Typography>
            <Typography variant="body1" paragraph>
              Regarding intellectual property:
            </Typography>
            <List sx={{ mb: 3 }}>
              <ListItem>
                <ListItemText primary="We retain all rights to our Service and technology" />
              </ListItem>
              <ListItem>
                <ListItemText primary="You retain rights to your content" />
              </ListItem>
              <ListItem>
                <ListItemText primary="You grant us license to use your content for the Service" />
              </ListItem>
              <ListItem>
                <ListItemText primary="You may not use our trademarks without permission" />
              </ListItem>
              <ListItem>
                <ListItemText primary="DMCA procedures apply to copyright claims" />
              </ListItem>
            </List>

            <Divider sx={{ my: 4 }} />

            <Typography variant="h5" gutterBottom>
              9. Privacy and Data
            </Typography>
            <Typography variant="body1" paragraph>
              Your use of our Service is subject to our Privacy Policy. By using the Service, 
              you consent to our collection and use of data as described in the Privacy Policy.
            </Typography>

            <Divider sx={{ my: 4 }} />

            <Typography variant="h5" gutterBottom>
              10. Disclaimers and Limitations
            </Typography>
            <Typography variant="body1" paragraph>
              THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE DISCLAIM ALL 
              WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR 
              PURPOSE, AND NON-INFRINGEMENT.
            </Typography>
            <Typography variant="body1" paragraph>
              IN NO EVENT SHALL LOGOS ECOSYSTEM BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, 
              CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES.
            </Typography>

            <Divider sx={{ my: 4 }} />

            <Typography variant="h5" gutterBottom>
              11. Indemnification
            </Typography>
            <Typography variant="body1" paragraph>
              You agree to indemnify and hold harmless LOGOS ECOSYSTEM from any claims, damages, 
              or expenses arising from your use of the Service or violation of these Terms.
            </Typography>

            <Divider sx={{ my: 4 }} />

            <Typography variant="h5" gutterBottom>
              12. Termination
            </Typography>
            <Typography variant="body1" paragraph>
              We may terminate or suspend your account at any time for violations of these Terms. 
              You may terminate your account at any time through your account settings.
            </Typography>

            <Divider sx={{ my: 4 }} />

            <Typography variant="h5" gutterBottom>
              13. Governing Law
            </Typography>
            <Typography variant="body1" paragraph>
              These Terms are governed by the laws of California, United States, without regard 
              to conflict of law principles. Any disputes shall be resolved in the courts of 
              San Francisco County, California.
            </Typography>

            <Divider sx={{ my: 4 }} />

            <Typography variant="h5" gutterBottom>
              14. Changes to Terms
            </Typography>
            <Typography variant="body1" paragraph>
              We reserve the right to modify these Terms at any time. We will notify users of 
              material changes via email or Service notification. Continued use after changes 
              constitutes acceptance.
            </Typography>

            <Divider sx={{ my: 4 }} />

            <Typography variant="h5" gutterBottom>
              15. Contact Information
            </Typography>
            <Typography variant="body1" paragraph>
              For questions about these Terms, please contact us at:
            </Typography>
            <Typography variant="body1" component="div" sx={{ ml: 2 }}>
              Email: legal@logos-ecosystem.ai<br />
              Address: LOGOS ECOSYSTEM Inc.<br />
              123 AI Boulevard<br />
              San Francisco, CA 94105<br />
              United States
            </Typography>

            <Divider sx={{ my: 4 }} />

            <Typography variant="body2" sx={{ mt: 4, opacity: 0.7 }}>
              By using LOGOS ECOSYSTEM, you acknowledge that you have read, understood, and agree 
              to be bound by these Terms of Service.
            </Typography>
          </Paper>
        </Container>
      </Box>
    </>
  );
}