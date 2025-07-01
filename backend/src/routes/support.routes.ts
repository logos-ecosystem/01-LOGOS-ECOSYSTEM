import { Router } from 'express';
import multer from 'multer';
import supportController from '../controllers/support.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { body, param, query } from 'express-validator';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Allow images, PDFs, and text files
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Get tickets
router.get('/tickets',
  [
    query('status').optional().isIn(['open', 'in_progress', 'waiting_customer', 'waiting_support', 'resolved', 'closed']),
    query('category').optional().isIn(['technical', 'billing', 'account', 'feature_request', 'bug_report', 'integration', 'other']),
    query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 })
  ],
  validateRequest,
  supportController.getTickets
);

// Get ticket details
router.get('/tickets/:id',
  [
    param('id').isUUID().withMessage('Invalid ticket ID')
  ],
  validateRequest,
  supportController.getTicketDetails
);

// Create new ticket
router.post('/tickets',
  upload.array('attachments', 5),
  [
    body('subject').notEmpty().withMessage('Subject is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('category').isIn(['technical', 'billing', 'account', 'feature_request', 'bug_report', 'integration', 'other']),
    body('priority').isIn(['low', 'medium', 'high', 'urgent'])
  ],
  validateRequest,
  supportController.createTicket
);

// Update ticket
router.put('/tickets/:id',
  [
    param('id').isUUID().withMessage('Invalid ticket ID'),
    body('status').optional().isIn(['open', 'in_progress', 'waiting_customer', 'waiting_support', 'resolved', 'closed']),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
    body('assignedTo').optional().isUUID()
  ],
  validateRequest,
  supportController.updateTicket
);

// Close ticket
router.post('/tickets/:id/close',
  [
    param('id').isUUID().withMessage('Invalid ticket ID'),
    body('satisfaction').optional().isInt({ min: 1, max: 5 })
  ],
  validateRequest,
  supportController.closeTicket
);

// Add message to ticket
router.post('/tickets/:id/messages',
  upload.array('attachments', 3),
  [
    param('id').isUUID().withMessage('Invalid ticket ID'),
    body('message').notEmpty().withMessage('Message is required')
  ],
  validateRequest,
  supportController.addMessage
);

// Get ticket messages
router.get('/tickets/:id/messages',
  [
    param('id').isUUID().withMessage('Invalid ticket ID')
  ],
  validateRequest,
  supportController.getTicketMessages
);

// Get ticket statistics
router.get('/stats', supportController.getTicketStats);

// Knowledge base search
router.get('/knowledge-base/search',
  [
    query('q').notEmpty().withMessage('Search query is required')
  ],
  validateRequest,
  supportController.searchKnowledgeBase
);

// Get knowledge base article
router.get('/knowledge-base/:id',
  [
    param('id').notEmpty()
  ],
  validateRequest,
  supportController.getKnowledgeBaseArticle
);

// Get knowledge base categories
router.get('/knowledge-base/categories', supportController.getKnowledgeBaseCategories);

// Get articles by category
router.get('/knowledge-base',
  [
    query('category').optional().isString()
  ],
  validateRequest,
  supportController.getArticlesByCategory
);

// Rate knowledge base article
router.post('/knowledge-base/:id/rate',
  [
    param('id').notEmpty(),
    body('helpful').isBoolean()
  ],
  validateRequest,
  supportController.rateArticle
);

// Get FAQs
router.get('/faqs',
  [
    query('category').optional().isString()
  ],
  validateRequest,
  supportController.getFAQs
);

// Rate FAQ
router.post('/faqs/:id/rate',
  [
    param('id').notEmpty(),
    body('helpful').isBoolean()
  ],
  validateRequest,
  supportController.rateFAQ
);

// Live chat endpoints
router.post('/live-chat/initiate', supportController.initiateLiveChat);

router.post('/live-chat/:sessionId/end',
  [
    param('sessionId').isUUID()
  ],
  validateRequest,
  supportController.endLiveChat
);

// Export tickets
router.get('/tickets/export',
  [
    query('format').optional().isIn(['csv', 'pdf'])
  ],
  validateRequest,
  supportController.exportTickets
);

export default router;