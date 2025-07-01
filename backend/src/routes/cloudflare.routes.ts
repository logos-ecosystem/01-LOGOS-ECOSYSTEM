import { Router } from 'express';
import { cloudflareController } from '../api/controllers/cloudflare.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';

const router = Router();

// All routes require admin authentication
router.use(authMiddleware);
router.use(adminMiddleware);

// Zone management
router.get('/zones', cloudflareController.getZones);

// DNS management
router.get('/zones/:zoneId/dns-records', cloudflareController.getDNSRecords);
router.post('/zones/:domain/dns-records', cloudflareController.createDNSRecord);
router.put('/zones/:domain/dns-records/:recordId', cloudflareController.updateDNSRecord);
router.delete('/zones/:domain/dns-records/:recordId', cloudflareController.deleteDNSRecord);

// SSL management
router.get('/zones/:domain/ssl', cloudflareController.getSSLSettings);
router.put('/zones/:domain/ssl', cloudflareController.updateSSLSettings);

// Cache management
router.post('/zones/:domain/purge-cache', cloudflareController.purgeCache);

// Ecosystem setup
router.post('/setup-ecosystem', cloudflareController.setupEcosystem);

// Configuration verification
router.get('/verify', cloudflareController.verifyConfiguration);

export default router;