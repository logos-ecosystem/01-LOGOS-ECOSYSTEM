"""Invoice generation and management service."""

from typing import Dict, Any, List, Optional
from decimal import Decimal
from datetime import datetime, timedelta
import uuid
from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from sqlalchemy.orm import Session
import qrcode

from ...shared.models.wallet import Invoice, WalletTransaction
from ...shared.models.user import User
from ...shared.utils.logger import get_logger
from ...shared.utils.config import get_settings
settings = get_settings()
# from ..email.whitelabel_email import WhitelabelEmailService
# email_service = WhitelabelEmailService()  # TODO: Fix email service import
email_service = None  # Temporary

logger = get_logger(__name__)


class InvoiceService:
    """Service for generating and managing invoices."""
    
    def __init__(self):
        self.invoice_prefix = "INV"
        self.payment_terms_days = 30
        self.tax_rate = Decimal("0.0")  # Can be configured per region
        
    async def create_invoice(
        self,
        user_id: str,
        customer_info: Dict[str, Any],
        items: List[Dict[str, Any]],
        currency: str = "USD",
        due_days: Optional[int] = None,
        notes: Optional[str] = None,
        db: Session = None
    ) -> Invoice:
        """Create a new invoice."""
        try:
            # Calculate totals
            subtotal = Decimal("0")
            for item in items:
                amount = Decimal(str(item["quantity"])) * Decimal(str(item["unit_price"]))
                subtotal += amount
            
            tax_amount = subtotal * self.tax_rate
            total_amount = subtotal + tax_amount
            
            # Generate invoice number
            invoice_number = self._generate_invoice_number()
            
            # Create invoice
            invoice = Invoice(
                id=str(uuid.uuid4()),
                invoice_number=invoice_number,
                user_id=user_id,
                customer_name=customer_info.get("name"),
                customer_email=customer_info.get("email"),
                customer_address=customer_info.get("address"),
                customer_tax_id=customer_info.get("tax_id"),
                items=items,
                subtotal=subtotal,
                tax_rate=self.tax_rate,
                tax_amount=tax_amount,
                total_amount=total_amount,
                currency=currency,
                status="draft",
                due_date=datetime.utcnow() + timedelta(days=due_days or self.payment_terms_days),
                notes=notes,
                metadata={
                    "created_by": user_id,
                    "payment_terms": f"Net {due_days or self.payment_terms_days}"
                }
            )
            
            db.add(invoice)
            db.commit()
            db.refresh(invoice)
            
            logger.info(f"Created invoice {invoice_number} for {total_amount} {currency}")
            
            return invoice
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error creating invoice: {str(e)}")
            raise
    
    async def send_invoice(
        self,
        invoice_id: str,
        user_id: str,
        message: Optional[str] = None,
        db: Session = None
    ) -> Dict[str, Any]:
        """Send invoice to customer."""
        invoice = db.query(Invoice).filter_by(id=invoice_id, user_id=user_id).first()
        if not invoice:
            raise ValueError("Invoice not found")
        
        if invoice.status not in ["draft", "sent"]:
            raise ValueError(f"Cannot send invoice in status: {invoice.status}")
        
        # Generate PDF
        pdf_buffer = await self.generate_invoice_pdf(invoice)
        
        # Send email
        email_sent = await email_service.send_invoice_email(
            recipient_email=invoice.customer_email,
            invoice_number=invoice.invoice_number,
            amount=invoice.total_amount,
            currency=invoice.currency,
            due_date=invoice.due_date,
            pdf_attachment=pdf_buffer.getvalue(),
            message=message
        )
        
        if email_sent:
            invoice.status = "sent"
            invoice.sent_at = datetime.utcnow()
            db.commit()
        
        return {
            "invoice_id": invoice_id,
            "status": "sent",
            "sent_to": invoice.customer_email,
            "sent_at": invoice.sent_at
        }
    
    async def generate_invoice_pdf(self, invoice: Invoice) -> BytesIO:
        """Generate PDF for invoice."""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        story = []
        styles = getSampleStyleSheet()
        
        # Company header
        company_style = ParagraphStyle(
            'CompanyHeader',
            parent=styles['Heading1'],
            fontSize=20,
            textColor=colors.HexColor('#333333')
        )
        story.append(Paragraph(settings.COMPANY_NAME, company_style))
        story.append(Spacer(1, 0.5 * inch))
        
        # Invoice details
        invoice_data = [
            ["Invoice Number:", invoice.invoice_number],
            ["Date:", invoice.created_at.strftime("%Y-%m-%d")],
            ["Due Date:", invoice.due_date.strftime("%Y-%m-%d")],
            ["Status:", invoice.status.upper()]
        ]
        
        invoice_table = Table(invoice_data, colWidths=[2 * inch, 3 * inch])
        invoice_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ]))
        story.append(invoice_table)
        story.append(Spacer(1, 0.5 * inch))
        
        # Bill to
        bill_to_style = ParagraphStyle(
            'BillTo',
            parent=styles['Heading2'],
            fontSize=14
        )
        story.append(Paragraph("Bill To:", bill_to_style))
        story.append(Paragraph(invoice.customer_name, styles['Normal']))
        if invoice.customer_address:
            story.append(Paragraph(invoice.customer_address, styles['Normal']))
        story.append(Paragraph(invoice.customer_email, styles['Normal']))
        story.append(Spacer(1, 0.5 * inch))
        
        # Items table
        items_data = [["Description", "Quantity", "Unit Price", "Amount"]]
        for item in invoice.items:
            items_data.append([
                item["description"],
                str(item["quantity"]),
                f"{invoice.currency} {item['unit_price']:.2f}",
                f"{invoice.currency} {(Decimal(str(item['quantity'])) * Decimal(str(item['unit_price']))):.2f}"
            ])
        
        items_table = Table(items_data, colWidths=[3 * inch, 1 * inch, 1.5 * inch, 1.5 * inch])
        items_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (1, 1), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        story.append(items_table)
        story.append(Spacer(1, 0.5 * inch))
        
        # Totals
        totals_data = [
            ["Subtotal:", f"{invoice.currency} {invoice.subtotal:.2f}"],
            [f"Tax ({(invoice.tax_rate * 100):.1f}%):", f"{invoice.currency} {invoice.tax_amount:.2f}"],
            ["Total:", f"{invoice.currency} {invoice.total_amount:.2f}"]
        ]
        
        totals_table = Table(totals_data, colWidths=[5 * inch, 2 * inch])
        totals_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 12),
            ('LINEABOVE', (0, -1), (-1, -1), 2, colors.black),
        ]))
        story.append(totals_table)
        
        # Payment QR code
        if invoice.payment_url:
            qr = qrcode.QRCode(version=1, box_size=10, border=5)
            qr.add_data(invoice.payment_url)
            qr.make(fit=True)
            qr_img = qr.make_image(fill_color="black", back_color="white")
            
            # Add QR code to PDF
            story.append(Spacer(1, 0.5 * inch))
            story.append(Paragraph("Scan to pay:", styles['Normal']))
            # QR code would be added here in production
        
        # Notes
        if invoice.notes:
            story.append(Spacer(1, 0.5 * inch))
            story.append(Paragraph("Notes:", styles['Heading3']))
            story.append(Paragraph(invoice.notes, styles['Normal']))
        
        # Build PDF
        doc.build(story)
        buffer.seek(0)
        
        return buffer
    
    async def mark_invoice_paid(
        self,
        invoice_id: str,
        payment_method: str,
        payment_reference: Optional[str] = None,
        db: Session = None
    ) -> Invoice:
        """Mark invoice as paid."""
        invoice = db.query(Invoice).filter_by(id=invoice_id).first()
        if not invoice:
            raise ValueError("Invoice not found")
        
        if invoice.status == "paid":
            raise ValueError("Invoice already paid")
        
        invoice.status = "paid"
        invoice.paid_at = datetime.utcnow()
        invoice.payment_method = payment_method
        invoice.payment_reference = payment_reference
        
        # Create transaction record
        transaction = WalletTransaction(
            wallet_id=invoice.user_id,  # Should be wallet_id
            type="earning",
            amount=float(invoice.total_amount),
            currency=invoice.currency,
            status="completed",
            description=f"Payment for invoice {invoice.invoice_number}",
            reference_type="invoice",
            reference_id=invoice.id
        )
        
        db.add(transaction)
        db.commit()
        
        logger.info(f"Invoice {invoice.invoice_number} marked as paid")
        
        return invoice
    
    async def get_invoices(
        self,
        user_id: str,
        status: Optional[str] = None,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
        db: Session = None
    ) -> List[Invoice]:
        """Get user's invoices with filters."""
        query = db.query(Invoice).filter(Invoice.user_id == user_id)
        
        if status:
            query = query.filter(Invoice.status == status)
        
        if from_date:
            query = query.filter(Invoice.created_at >= from_date)
        
        if to_date:
            query = query.filter(Invoice.created_at <= to_date)
        
        return query.order_by(Invoice.created_at.desc()).offset(offset).limit(limit).all()
    
    async def get_invoice_statistics(
        self,
        user_id: str,
        period: str = "month",
        db: Session = None
    ) -> Dict[str, Any]:
        """Get invoice statistics for user."""
        # Calculate period
        now = datetime.utcnow()
        if period == "month":
            start_date = now.replace(day=1)
        elif period == "year":
            start_date = now.replace(month=1, day=1)
        else:
            start_date = now - timedelta(days=30)
        
        invoices = await self.get_invoices(
            user_id=user_id,
            from_date=start_date,
            db=db
        )
        
        # Calculate statistics
        total_invoiced = sum(inv.total_amount for inv in invoices)
        total_paid = sum(inv.total_amount for inv in invoices if inv.status == "paid")
        total_pending = sum(inv.total_amount for inv in invoices if inv.status in ["sent", "overdue"])
        
        return {
            "period": period,
            "total_invoices": len(invoices),
            "total_invoiced": float(total_invoiced),
            "total_paid": float(total_paid),
            "total_pending": float(total_pending),
            "paid_count": len([inv for inv in invoices if inv.status == "paid"]),
            "pending_count": len([inv for inv in invoices if inv.status in ["sent", "overdue"]]),
            "overdue_count": len([inv for inv in invoices if inv.status == "overdue"])
        }
    
    async def check_overdue_invoices(self, db: Session):
        """Check and update overdue invoices."""
        overdue_invoices = db.query(Invoice).filter(
            Invoice.status == "sent",
            Invoice.due_date < datetime.utcnow()
        ).all()
        
        for invoice in overdue_invoices:
            invoice.status = "overdue"
            
            # Send reminder email
            await email_service.send_invoice_reminder(
                recipient_email=invoice.customer_email,
                invoice_number=invoice.invoice_number,
                amount=invoice.total_amount,
                days_overdue=(datetime.utcnow() - invoice.due_date).days
            )
        
        db.commit()
        
        logger.info(f"Updated {len(overdue_invoices)} overdue invoices")
    
    def _generate_invoice_number(self) -> str:
        """Generate unique invoice number."""
        timestamp = datetime.utcnow().strftime("%Y%m%d")
        random_suffix = uuid.uuid4().hex[:6].upper()
        return f"{self.invoice_prefix}-{timestamp}-{random_suffix}"


# Create singleton instance
invoice_service = InvoiceService()
