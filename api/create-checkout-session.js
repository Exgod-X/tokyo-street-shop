const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Your product data (must match your frontend)
const PRODUCTS = {
  'prod_001': { name: 'Akatsuki Cloud Hoodie', price: 7999 },      // Price in cents
  'prod_002': { name: 'Demon Slayer Corps Tee', price: 3999 },
  'prod_003': { name: 'Jujutsu Kaisen Oversized Hoodie', price: 8999 },
  'prod_004': { name: 'Attack on Titan Survey Corps Tee', price: 4499 },
  'prod_005': { name: 'One Piece Straw Hat Hoodie', price: 7499 },
  'prod_006': { name: 'Chainsaw Man Power Tee', price: 4299 },
  'prod_007': { name: 'Spy x Family Zip Hoodie', price: 8499 },
  'prod_008': { name: 'My Hero Academia Plus Ultra Tee', price: 3899 }
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
      // Optional: Add shipping
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'JP', 'SG', 'MY', 'PH'],
      },
      // Optional: Add shipping options
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: {
              amount: 999,
              currency: 'usd',
            },
            display_name: 'Standard Shipping',
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
              amount: 1999,
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
