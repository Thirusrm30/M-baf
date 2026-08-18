import { Platform, Alert } from 'react-native';
import { formatDate } from './dateUtils';

function formatCurrency(amount) {
    return `₹${(parseFloat(amount) || 0).toLocaleString('en-IN')}`;
}

function buildReceiptHTML(order) {
    const orderDate = order.createdAt ? formatDate(order.createdAt) : 'N/A';
    const deliveryDate = order.deliveryDate ? formatDate(order.deliveryDate) : 'N/A';
    const orderNo = order.orderNo || order.id || 'N/A';

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Receipt - ${orderNo}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; display: flex; justify-content: center; padding: 20px; }
  .receipt { background: #fff; max-width: 480px; width: 100%; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); overflow: hidden; }
  .header { background: #2D2319; color: #fff; padding: 28px 24px; text-align: center; }
  .header h1 { font-size: 20px; letter-spacing: 1px; margin-bottom: 4px; }
  .header p { font-size: 12px; opacity: 0.7; }
  .order-badge { display: inline-block; background: rgba(255,255,255,0.15); padding: 4px 14px; border-radius: 20px; font-size: 13px; margin-top: 10px; letter-spacing: 0.5px; }
  .body { padding: 24px; }
  .section { margin-bottom: 20px; }
  .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #A89888; font-weight: 600; margin-bottom: 8px; }
  .row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; }
  .row-label { font-size: 14px; color: #7A6B5D; }
  .row-value { font-size: 14px; color: #2D2319; font-weight: 600; text-align: right; }
  .divider { border: none; border-top: 1px solid #F0E8E0; margin: 16px 0; }
  .total-row { background: #FDF2E0; margin: 0 -24px; padding: 14px 24px; display: flex; justify-content: space-between; align-items: center; }
  .total-label { font-size: 15px; font-weight: 700; color: #2D2319; }
  .total-value { font-size: 20px; font-weight: 700; color: #B8860B; }
  .status-badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
  .status-pending { background: #E8F0F8; color: #7A9EB8; }
  .status-production { background: #FFF8E7; color: #D4A843; }
  .status-ready { background: #E8F5E8; color: #6B9E6B; }
  .status-delivered { background: #E8F5E8; color: #6B9E6B; }
  .footer { text-align: center; padding: 16px 24px; background: #FDF6F0; font-size: 11px; color: #A89888; }
  @media print { body { background: none; padding: 0; } .receipt { box-shadow: none; } }
</style>
</head>
<body>
<div class="receipt">
  <div class="header">
    <h1>Mellinam Designer Studio</h1>
    <p>Excellence in every stitch</p>
    <div class="order-badge">${orderNo}</div>
  </div>
  <div class="body">
    <div class="section">
      <div class="section-title">Order Details</div>
      <div class="row"><span class="row-label">Order ID</span><span class="row-value">${orderNo}</span></div>
      <div class="row"><span class="row-label">Customer</span><span class="row-value">${order.customerName || 'N/A'}</span></div>
      ${order.phone ? `<div class="row"><span class="row-label">Phone</span><span class="row-value">${order.phone}</span></div>` : ''}
      <div class="row"><span class="row-label">Design</span><span class="row-value">${order.designName || 'N/A'}</span></div>
      ${order.tailorName ? `<div class="row"><span class="row-label">Tailor</span><span class="row-value">${order.tailorName}</span></div>` : ''}
      <div class="row"><span class="row-label">Status</span><span class="row-value"><span class="status-badge status-${(order.status || '').toLowerCase().replace(/\s/g, '-')}">${order.status || 'N/A'}</span></span></div>
    </div>
    <hr class="divider">
    <div class="section">
      <div class="section-title">Dates</div>
      <div class="row"><span class="row-label">Order Date</span><span class="row-value">${orderDate}</span></div>
      <div class="row"><span class="row-label">Delivery Date</span><span class="row-value">${deliveryDate}</span></div>
    </div>
    <hr class="divider">
    <div class="section">
      <div class="section-title">Payment</div>
      <div class="row"><span class="row-label">Total Amount</span><span class="row-value">${formatCurrency(order.totalAmount)}</span></div>
      <div class="row"><span class="row-label">Advance Paid</span><span class="row-value">${formatCurrency(order.advanceAmount)}</span></div>
      <div class="row"><span class="row-label">Balance Due</span><span class="row-value">${formatCurrency(order.balanceAmount)}</span></div>
    </div>
    <div class="total-row">
      <span class="total-label">Total</span>
      <span class="total-value">${formatCurrency(order.totalAmount)}</span>
    </div>
  </div>
  <div class="footer">Thank you for your order! | Mellinam Designer Studio</div>
</div>
</body>
</html>`;
}

function buildPlainTextReceipt(order) {
    const orderDate = order.createdAt ? formatDate(order.createdAt) : 'N/A';
    const deliveryDate = order.deliveryDate ? formatDate(order.deliveryDate) : 'N/A';
    const orderNo = order.orderNo || order.id || 'N/A';
    const line = '─'.repeat(36);

    return [
        '     MELLINAM DESIGNER STUDIO',
        '     Excellence in every stitch',
        '',
        line,
        `  Order ID:    ${orderNo}`,
        `  Customer:    ${order.customerName || 'N/A'}`,
        order.phone ? `  Phone:       ${order.phone}` : null,
        `  Design:      ${order.designName || 'N/A'}`,
        order.tailorName ? `  Tailor:      ${order.tailorName}` : null,
        `  Status:      ${order.status || 'N/A'}`,
        line,
        `  Order Date:  ${orderDate}`,
        `  Delivery:    ${deliveryDate}`,
        line,
        `  Total:       ${formatCurrency(order.totalAmount)}`,
        `  Advance:     ${formatCurrency(order.advanceAmount)}`,
        `  Balance:     ${formatCurrency(order.balanceAmount)}`,
        line,
        '',
        '  Thank you for your order!',
    ].filter(Boolean).join('\n');
}

export function generateReceipt(order) {
    if (!order) return;

    if (Platform.OS === 'web') {
        const html = buildReceiptHTML(order);
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `receipt-${order.orderNo || order.id || 'order'}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } else {
        const text = buildPlainTextReceipt(order);
        Alert.alert('Order Receipt', text, [{ text: 'OK' }], { cancelable: true });
    }
}
