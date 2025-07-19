// Complete e-commerce checkout implementation with Fat Zebra integration

import React, { useState, useEffect } from 'react';
import { PaymentForm, usePayment, useOAuthPayment } from '@fwc/fat-zebra-nextjs';
import type { PaymentFormData } from '@fwc/fat-zebra-nextjs';

// Types for our e-commerce example
interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface ShippingAddress {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
}

interface Order {
  id: string;
  items: CartItem[];
  shipping: ShippingAddress;
  subtotal: number;
  shipping_cost: number;
  tax: number;
  total: number;
  currency: string;
}

// Mock cart data
const mockCartItems: CartItem[] = [
  {
    id: '1',
    name: 'Premium Wireless Headphones',
    price: 199.95,
    quantity: 1,
    image: '/images/headphones.jpg'
  },
  {
    id: '2',
    name: 'Bluetooth Speaker',
    price: 79.95,
    quantity: 2,
    image: '/images/speaker.jpg'
  }
];

// Shipping options
const SHIPPING_OPTIONS = [
  { id: 'standard', name: 'Standard Delivery (5-7 days)', cost: 9.95 },
  { id: 'express', name: 'Express Delivery (2-3 days)', cost: 19.95 },
  { id: 'overnight', name: 'Overnight Delivery', cost: 29.95 }
];

// Main checkout component
export const EcommerceCheckout: React.FC = () => {
  const [step, setStep] = useState<'shipping' | 'payment' | 'confirmation'>('shipping');
  const [order, setOrder] = useState<Order | null>(null);
  const [selectedShipping, setSelectedShipping] = useState(SHIPPING_OPTIONS[0]);
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    state: 'NSW',
    postcode: '',
    country: 'AU'
  });
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'secure_card'>('card');
  const [accessToken, setAccessToken] = useState<string>('');

  // Calculate order totals
  useEffect(() => {
    const subtotal = mockCartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.10; // 10% GST
    const total = subtotal + selectedShipping.cost + tax;

    setOrder({
      id: `ORD-${Date.now()}`,
      items: mockCartItems,
      shipping: shippingAddress,
      subtotal,
      shipping_cost: selectedShipping.cost,
      tax,
      total,
      currency: 'AUD'
    });
  }, [selectedShipping, shippingAddress]);

  // Generate OAuth token for secure payments
  useEffect(() => {
    if (paymentMethod === 'secure_card') {
      generateOAuthToken();
    }
  }, [paymentMethod]);

  const generateOAuthToken = async () => {
    try {
      const response = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        setAccessToken(data.accessToken);
      }
    } catch (error) {
      console.error('Failed to generate access token:', error);
    }
  };

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate shipping address
    if (!shippingAddress.firstName || !shippingAddress.lastName || 
        !shippingAddress.address || !shippingAddress.city || !shippingAddress.postcode) {
      alert('Please fill in all required shipping fields');
      return;
    }

    setStep('payment');
  };

  const handlePaymentSuccess = () => {
    setStep('confirmation');
  };

  if (!order) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>
        
        {/* Progress Steps */}
        <CheckoutProgress currentStep={step} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {step === 'shipping' && (
              <ShippingForm
                address={shippingAddress}
                setAddress={setShippingAddress}
                shippingOptions={SHIPPING_OPTIONS}
                selectedShipping={selectedShipping}
                setSelectedShipping={setSelectedShipping}
                onSubmit={handleShippingSubmit}
              />
            )}

            {step === 'payment' && (
              <PaymentStep
                order={order}
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                accessToken={accessToken}
                onSuccess={handlePaymentSuccess}
              />
            )}

            {step === 'confirmation' && (
              <OrderConfirmation order={order} />
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <OrderSummary order={order} />
          </div>
        </div>
      </div>
    </div>
  );
};

// Progress indicator component
const CheckoutProgress: React.FC<{ currentStep: string }> = ({ currentStep }) => {
  const steps = [
    { id: 'shipping', name: 'Shipping', icon: '📦' },
    { id: 'payment', name: 'Payment', icon: '💳' },
    { id: 'confirmation', name: 'Confirmation', icon: '✅' }
  ];

  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
            currentStep === step.id 
              ? 'bg-blue-100 text-blue-800' 
              : steps.findIndex(s => s.id === currentStep) > index
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-500'
          }`}>
            <span className="text-lg">{step.icon}</span>
            <span className="font-medium">{step.name}</span>
          </div>
          {index < steps.length - 1 && (
            <div className="w-8 h-px bg-gray-300 mx-2"></div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

// Shipping form component
const ShippingForm: React.FC<{
  address: ShippingAddress;
  setAddress: React.Dispatch<React.SetStateAction<ShippingAddress>>;
  shippingOptions: typeof SHIPPING_OPTIONS;
  selectedShipping: typeof SHIPPING_OPTIONS[0];
  setSelectedShipping: React.Dispatch<React.SetStateAction<typeof SHIPPING_OPTIONS[0]>>;
  onSubmit: (e: React.FormEvent) => void;
}> = ({ address, setAddress, shippingOptions, selectedShipping, setSelectedShipping, onSubmit }) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setAddress(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Shipping Information</h2>
      
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name *
            </label>
            <input
              type="text"
              name="firstName"
              value={address.firstName}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name *
            </label>
            <input
              type="text"
              name="lastName"
              value={address.lastName}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Address *
          </label>
          <input
            type="text"
            name="address"
            value={address.address}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City *
            </label>
            <input
              type="text"
              name="city"
              value={address.city}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State *
            </label>
            <select
              name="state"
              value={address.state}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="NSW">NSW</option>
              <option value="VIC">VIC</option>
              <option value="QLD">QLD</option>
              <option value="WA">WA</option>
              <option value="SA">SA</option>
              <option value="TAS">TAS</option>
              <option value="ACT">ACT</option>
              <option value="NT">NT</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Postcode *
            </label>
            <input
              type="text"
              name="postcode"
              value={address.postcode}
              onChange={handleInputChange}
              pattern="[0-9]{4}"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        {/* Shipping Options */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Shipping Method</h3>
          <div className="space-y-3">
            {shippingOptions.map((option) => (
              <div
                key={option.id}
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  selectedShipping.id === option.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedShipping(option)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      type="radio"
                      name="shipping"
                      value={option.id}
                      checked={selectedShipping.id === option.id}
                      onChange={() => setSelectedShipping(option)}
                      className="h-4 w-4 text-blue-600"
                    />
                    <div className="ml-3">
                      <p className="font-medium text-gray-900">{option.name}</p>
                    </div>
                  </div>
                  <p className="font-medium text-gray-900">${option.cost.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 transition-colors"
        >
          Continue to Payment
        </button>
      </form>
    </div>
  );
};

// Payment step component
const PaymentStep: React.FC<{
  order: Order;
  paymentMethod: 'card' | 'secure_card';
  setPaymentMethod: React.Dispatch<React.SetStateAction<'card' | 'secure_card'>>;
  accessToken: string;
  onSuccess: () => void;
}> = ({ order, paymentMethod, setPaymentMethod, accessToken, onSuccess }) => {
  
  // Standard payment hook
  const standardPayment = usePayment();
  
  // OAuth payment hook for 3DS2
  const securePayment = useOAuthPayment(
    accessToken,
    process.env.NEXT_PUBLIC_FATZEBRA_USERNAME || '',
    { enableTokenization: true, enable3DS: true }
  );

  const currentPayment = paymentMethod === 'secure_card' ? securePayment : standardPayment;

  const handlePaymentSubmit = async (paymentData: PaymentFormData) => {
    try {
      await currentPayment.processPayment({
        ...paymentData,
        amount: order.total,
        reference: order.id,
        customer: {
          first_name: order.shipping.firstName,
          last_name: order.shipping.lastName,
          email: paymentData.customer?.email || '',
          address: order.shipping.address,
          city: order.shipping.city,
          state: order.shipping.state,
          postcode: order.shipping.postcode,
          country: order.shipping.country
        }
      });

      onSuccess();
    } catch (error) {
      console.error('Payment failed:', error);
    }
  };

  const handleTokenizationSuccess = (token: string) => {
    console.log('Card tokenized for future use:', token);
    // Store token for future purchases
  };

  if (currentPayment.success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="text-center">
          <div className="text-green-600 text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-green-800 mb-2">Payment Successful!</h2>
          <p className="text-green-700">
            Your order #{order.id} has been processed successfully.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Payment Information</h2>
      
      {/* Payment Method Selection */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Method</h3>
        <div className="space-y-3">
          <div
            className={`border rounded-lg p-4 cursor-pointer transition-colors ${
              paymentMethod === 'card'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setPaymentMethod('card')}
          >
            <div className="flex items-center">
              <input
                type="radio"
                name="paymentMethod"
                value="card"
                checked={paymentMethod === 'card'}
                onChange={() => setPaymentMethod('card')}
                className="h-4 w-4 text-blue-600"
              />
              <div className="ml-3">
                <p className="font-medium text-gray-900">💳 Standard Payment</p>
                <p className="text-sm text-gray-500">Fast and secure payment processing</p>
              </div>
            </div>
          </div>

          <div
            className={`border rounded-lg p-4 cursor-pointer transition-colors ${
              paymentMethod === 'secure_card'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setPaymentMethod('secure_card')}
          >
            <div className="flex items-center">
              <input
                type="radio"
                name="paymentMethod"
                value="secure_card"
                checked={paymentMethod === 'secure_card'}
                onChange={() => setPaymentMethod('secure_card')}
                className="h-4 w-4 text-blue-600"
              />
              <div className="ml-3">
                <p className="font-medium text-gray-900">🔒 Secure Payment (3DS2)</p>
                <p className="text-sm text-gray-500">Enhanced security with 3D Secure authentication</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Form */}
      <PaymentForm
        onSubmit={handlePaymentSubmit}
        amount={order.total}
        currency={order.currency}
        loading={currentPayment.loading}
        enableTokenization={paymentMethod === 'secure_card'}
        enable3DS={paymentMethod === 'secure_card'}
        accessToken={paymentMethod === 'secure_card' ? accessToken : undefined}
        username={paymentMethod === 'secure_card' ? process.env.NEXT_PUBLIC_FATZEBRA_USERNAME : undefined}
        onTokenizationSuccess={handleTokenizationSuccess}
        requireCustomer={true}
        className="space-y-4"
      />

      {currentPayment.error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-red-600 text-sm">{currentPayment.error}</p>
        </div>
      )}
    </div>
  );
};

// Order confirmation component
const OrderConfirmation: React.FC<{ order: Order }> = ({ order }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="text-center mb-8">
        <div className="text-green-600 text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Confirmed!</h2>
        <p className="text-gray-600">
          Thank you for your purchase. Your order #{order.id} has been confirmed.
        </p>
      </div>

      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Order Details</h3>
        
        <div className="space-y-4">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                📦
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{item.name}</p>
                <p className="text-gray-500">Quantity: {item.quantity}</p>
              </div>
              <p className="font-medium text-gray-900">
                ${(item.price * item.quantity).toFixed(2)}
              </p>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-200 mt-6 pt-6">
          <div className="space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>${order.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Shipping</span>
              <span>${order.shipping_cost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Tax (GST)</span>
              <span>${order.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-gray-900 border-t border-gray-200 pt-2">
              <span>Total</span>
              <span>${order.total.toFixed(2)} {order.currency}</span>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 mt-6 pt-6">
          <h4 className="font-medium text-gray-900 mb-2">Shipping Address</h4>
          <div className="text-gray-600">
            <p>{order.shipping.firstName} {order.shipping.lastName}</p>
            <p>{order.shipping.address}</p>
            <p>{order.shipping.city}, {order.shipping.state} {order.shipping.postcode}</p>
            <p>{order.shipping.country}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Order summary component
const OrderSummary: React.FC<{ order: Order }> = ({ order }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 sticky top-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
      
      <div className="space-y-4 mb-6">
        {order.items.map((item) => (
          <div key={item.id} className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
              📦
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
              <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
            </div>
            <p className="text-sm font-medium text-gray-900">
              ${(item.price * item.quantity).toFixed(2)}
            </p>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-200 pt-4 space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Subtotal</span>
          <span>${order.subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Shipping</span>
          <span>${order.shipping_cost.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Tax (GST)</span>
          <span>${order.tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-lg font-bold text-gray-900 border-t border-gray-200 pt-2">
          <span>Total</span>
          <span>${order.total.toFixed(2)} {order.currency}</span>
        </div>
      </div>
    </div>
  );
};

export default EcommerceCheckout;