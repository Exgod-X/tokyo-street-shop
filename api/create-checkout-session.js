const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// LUXA — Print on Demand product catalog (prices in cents)
const PRODUCTS = {
  'p001': { name: 'Heritage Tee',              price: 3499 },
  'p002': { name: 'Drape Midi Dress',           price: 6499 },
  'p003': { name: 'Meridian Hoodie',            price: 6999 },
  'p004': { name: 'Canvas Oversized Tee',       price: 3999 },
  'p005': { name: 'Woven Bucket Hat',           price: 2999 },
  'p006': { name: 'Everyday Cargo Pant',        price: 7499 },
  'p007': { name: 'Structured Varsity Jacket',  price: 9999 },
  'p008': { name: 'Mini Crossbody Bag',         price: 4499 },
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0)
      return res.status(400).json({ error: 'No items provided' });

    const lineItems = items.map(item => {
      const product = PRODUCTS[item.productId];
      if (!product) throw new Error(`Product not found: ${item.productId}`);
      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${product.name} — Size: ${item.size}`,
            description: 'Made on demand · Ships in 5–10 business days',
          },
          unit_amount: product.price,
        },
        quantity: item.quantity,
      };
    });

    const subtotal = items.reduce((sum, item) => sum + (PRODUCTS[item.productId]?.price || 0) * item.quantity, 0);
    const freeShipping = subtotal >= 7500;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${req.headers.origin}/?success=true`,
      cancel_url:  `${req.headers.origin}/?canceled=true`,
      shipping_address_collection: {
        allowed_countries: [
          'US','CA','GB','AU','DE','FR','JP','SG','MY','PH',
          'IN','NZ','IE','NL','SE','DK','NO','CH','AT','BE',
          'IT','ES','PT','PL','CZ','HU','RO','BG','HR','GR',
          'ZA','NG','KE','GH','BR','MX','AR','CO','CL','PE',
          'AE','SA','KW','QA','BH','OM','TH','VN','ID','PK',
        ],
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: freeShipping ? 0 : 999, currency: 'usd' },
            display_name: freeShipping ? 'Free Standard Shipping' : 'Standard Shipping',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 5 },
              maximum: { unit: 'business_day', value: 10 },
            },
          },
        },
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: 1999, currency: 'usd' },
            display_name: 'Express Shipping',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 2 },
              maximum: { unit: 'business_day', value: 4 },
            },
          },
        },
      ],
      custom_text: {
        submit: { message: 'Your order will be printed and assembled just for you.' }
      },
    });

    res.status(200).json({ sessionId: session.id });

  } catch (error) {
    console.error('LUXA Stripe error:', error);
    res.status(500).json({ error: error.message });
  }
};
