const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// UPDATED PRODUCT DATA - Work Meme Apparel
const PRODUCTS = {
  'prod_001': { name: 'Meeting Could\'ve Been An Email Hoodie', price: 5499 },
  'prod_002': { name: 'Professional Overthinker Tee', price: 3499 },
  'prod_003': { name: 'Ctrl+Alt+Delete Monday Hoodie', price: 5999 },
  'prod_004': { name: 'Deadline Survivor Tee', price: 3799 },
  'prod_005': { name: 'Coffee Powered Hoodie', price: 5299 },
  'prod_006': { name: 'Send Help (and Coffee) Tee', price: 3699 },
  'prod_007': { name: 'Target Achieved* (*Barely) Hoodie', price: 5799 },
  'prod_008': { name: 'Spreadsheet Wizard Tee', price: 3599 }
};

module.exports = async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { items } = req.body;

    // Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items provided' });
    }

    // Build line items for Stripe
    const lineItems = items.map(item => {
      const product = PRODUCTS[item.productId];
      
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${product.name} (Size: ${item.size})`,
          },
          unit_amount: product.price, // Price in cents
        },
        quantity: item.quantity,
      };
    });

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${req.headers.origin}/?success=true`,
      cancel_url: `${req.headers.origin}/?canceled=true`,
      // Shipping
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'JP', 'SG', 'MY', 'PH', 'IN', 'BR', 'MX'],
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: {
              amount: 0, // Free shipping
              currency: 'usd',
            },
            display_name: 'Free Standard Shipping',
            delivery_estimate: {
              minimum: {
                unit: 'business_day',
                value: 5,
              },
              maximum: {
                unit: 'business_day',
                value: 10,
              },
            },
          },
        },
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: {
              amount: 1499, // $14.99
              currency: 'usd',
            },
            display_name: 'Express Shipping',
            delivery_estimate: {
              minimum: {
                unit: 'business_day',
                value: 2,
              },
              maximum: {
                unit: 'business_day',
                value: 4,
              },
            },
          },
        },
      ],
    });

    // Return the session ID
    res.status(200).json({ sessionId: session.id });

  } catch (error) {
    console.error('Stripe error:', error);
    res.status(500).json({ error: error.message });
  }
};
