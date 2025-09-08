import { PrismaClient } from '@prisma/client';
import PDFDocument from 'pdfkit';
import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

interface TradeConfirmationData {
  trade: any;
  order: any;
  trader: any;
}

export class ConfirmationService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Initialize email transporter (configure with actual SMTP settings in production)
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async generateTradeConfirmationPDF(data: TradeConfirmationData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('TRADE CONFIRMATION', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Trade Reference: ${data.trade.tradeReference}`, { align: 'center' });
      doc.text(`Date: ${new Date().toLocaleDateString()}`, { align: 'center' });
      doc.moveDown(2);

      // Trader Information
      doc.fontSize(14).text('TRADER INFORMATION', { underline: true });
      doc.fontSize(11);
      doc.text(`Firm: ${data.trader.firmName}`);
      doc.text(`Name: ${data.trader.firstName} ${data.trader.lastName}`);
      doc.text(`Email: ${data.trader.email}`);
      doc.moveDown();

      // Trade Details
      doc.fontSize(14).text('TRADE DETAILS', { underline: true });
      doc.fontSize(11);
      doc.text(`Product: ${data.order.product}`);
      doc.text(`Direction: ${data.order.direction}`);
      doc.text(`Quantity: ${data.trade.executionQuantity}`);
      doc.text(`Price: $${data.trade.executionPrice}`);
      if (data.order.tenor) {
        doc.text(`Tenor: ${data.order.tenor}`);
      }
      if (data.order.promptDate) {
        doc.text(`Prompt Date: ${new Date(data.order.promptDate).toLocaleDateString()}`);
      }
      doc.text(`Execution Date: ${new Date(data.trade.createdAt).toLocaleString()}`);
      doc.text(`Settlement Date: ${new Date(data.trade.settlementDate).toLocaleDateString()}`);
      doc.moveDown();

      // Order Information
      if (data.order.rfq) {
        doc.fontSize(14).text('RFQ INFORMATION', { underline: true });
        doc.fontSize(11);
        doc.text(`RFQ Reference: ${data.order.rfq.referenceNumber}`);
        doc.text(`RFQ Created: ${new Date(data.order.rfq.createdAt).toLocaleString()}`);
        doc.moveDown();
      }

      // Footer
      doc.moveDown(3);
      doc.fontSize(10).fillColor('gray');
      doc.text('This is an automatically generated trade confirmation.', { align: 'center' });
      doc.text('Please retain this document for your records.', { align: 'center' });
      doc.text('For any queries, please contact your account manager.', { align: 'center' });

      doc.end();
    });
  }

  async sendTradeConfirmation(
    tradeId: string,
    recipientEmails: string[]
  ): Promise<boolean> {
    try {
      // Fetch trade data with all relations
      const trade = await prisma.trade.findUnique({
        where: { id: tradeId },
        include: {
          order: {
            include: {
              trader: true,
              rfq: true
            }
          }
        }
      });

      if (!trade) {
        throw new Error('Trade not found');
      }

      // Generate PDF
      const pdfBuffer = await this.generateTradeConfirmationPDF({
        trade,
        order: trade.order,
        trader: trade.order.trader
      });

      // Save PDF to disk (optional)
      const fileName = `trade-confirmation-${trade.tradeReference}.pdf`;
      const filePath = path.join(process.cwd(), 'confirmations', fileName);
      
      // Ensure directory exists
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, pdfBuffer);

      // Send email with PDF attachment
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@metmatch.com',
        to: recipientEmails.join(', '),
        subject: `Trade Confirmation - ${trade.tradeReference}`,
        html: `
          <h2>Trade Confirmation</h2>
          <p>Dear ${trade.order.trader.firstName} ${trade.order.trader.lastName},</p>
          <p>Please find attached the confirmation for your trade:</p>
          <ul>
            <li><strong>Reference:</strong> ${trade.tradeReference}</li>
            <li><strong>Product:</strong> ${trade.order.product}</li>
            <li><strong>Direction:</strong> ${trade.order.direction}</li>
            <li><strong>Quantity:</strong> ${trade.executionQuantity}</li>
            <li><strong>Price:</strong> $${trade.executionPrice}</li>
            <li><strong>Settlement Date:</strong> ${new Date(trade.settlementDate).toLocaleDateString()}</li>
          </ul>
          <p>Thank you for trading on Met Match.</p>
          <p>Best regards,<br>Met Match Team</p>
        `,
        attachments: [
          {
            filename: fileName,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      };

      // In development, just log the email details
      if (process.env.NODE_ENV === 'development') {
        console.log('Trade confirmation email would be sent:', {
          to: recipientEmails,
          subject: mailOptions.subject,
          attachment: fileName
        });
        return true;
      }

      // In production, actually send the email
      await this.transporter.sendMail(mailOptions);

      // Update trade record
      await prisma.trade.update({
        where: { id: tradeId },
        data: { confirmationSent: true }
      });

      return true;
    } catch (error) {
      console.error('Error sending trade confirmation:', error);
      return false;
    }
  }

  async getConfirmationEmails(traderId: string): Promise<string[]> {
    // Get configured email addresses for the trader
    // This could be stored in user preferences or configuration
    const user = await prisma.user.findUnique({
      where: { id: traderId }
    });

    if (!user) {
      return [];
    }

    // Default to user's email, but in production this would include:
    // - Front office email
    // - Back office email
    // - Compliance email
    return [user.email];
  }

  async bulkExportConfirmations(
    startDate: Date,
    endDate: Date,
    traderId?: string
  ): Promise<Buffer> {
    const where: any = {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    };

    if (traderId) {
      where.order = { traderId };
    }

    const trades = await prisma.trade.findMany({
      where,
      include: {
        order: {
          include: {
            trader: true,
            rfq: true
          }
        }
      }
    });

    // Create a multi-page PDF with all confirmations
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Cover page
      doc.fontSize(24).text('TRADE CONFIRMATIONS REPORT', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`, { align: 'center' });
      doc.text(`Total Trades: ${trades.length}`, { align: 'center' });
      doc.text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });

      // Add each trade confirmation
      trades.forEach((trade, index) => {
        if (index > 0) {
          doc.addPage();
        } else {
          doc.moveDown(3);
        }

        // Trade header
        doc.fontSize(16).text(`Trade ${index + 1} of ${trades.length}`, { align: 'center' });
        doc.fontSize(12).text(`Reference: ${trade.tradeReference}`, { align: 'center' });
        doc.moveDown();

        // Trade details
        doc.fontSize(11);
        doc.text(`Trader: ${trade.order.trader.firmName}`);
        doc.text(`Product: ${trade.order.product}`);
        doc.text(`Direction: ${trade.order.direction}`);
        doc.text(`Quantity: ${trade.executionQuantity}`);
        doc.text(`Price: $${trade.executionPrice}`);
        doc.text(`Execution: ${new Date(trade.createdAt).toLocaleString()}`);
        doc.text(`Settlement: ${new Date(trade.settlementDate).toLocaleDateString()}`);
        doc.text(`Confirmation Sent: ${trade.confirmationSent ? 'Yes' : 'No'}`);
      });

      doc.end();
    });
  }
}

export const confirmationService = new ConfirmationService();