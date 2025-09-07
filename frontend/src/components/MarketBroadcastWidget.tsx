import { useState, useEffect, useRef } from 'react';
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { api } from '../services/api';
import { websocketService } from '../services/websocket';
import { useAuthStore } from '../store/authStore';

type Mode = 'broadcast' | 'order' | 'rfq';
type Strategy = 'carry' | 'outright' | 'options';
type Direction = 'BUY' | 'SELL' | 'BORROW' | 'LEND';

interface FormData {
  mode: Mode;
  strategy: Strategy;
  product: string;
  direction: Direction;
  quantity: string;
  price: string;
  tenor?: string;
  promptDate?: string;
  expiryDate?: string;
  strike?: string;
  optionType?: 'CALL' | 'PUT';
  specialInstructions?: string;
}

interface RecentTrade {
  id: string;
  product: string;
  direction: Direction;
  quantity: number;
  price: number;
  timestamp: Date;
}

const products = [
  'Naphtha',
  'Gasoline',
  'Jet Fuel',
  'ULSD',
  'Fuel Oil',
  'Crude Oil',
  'Natural Gas',
  'LPG',
  'Ethanol',
  'Biodiesel'
];

export default function MarketBroadcastWidget() {
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    mode: 'broadcast',
    strategy: 'outright',
    product: products[0],
    direction: 'BUY',
    quantity: '',
    price: '',
    tenor: '1M',
    promptDate: format(new Date(), 'yyyy-MM-dd'),
    expiryDate: format(new Date(), 'yyyy-MM-dd')
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [recentTrades, setRecentTrades] = useState<RecentTrade[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Load recent trades
  useEffect(() => {
    const loadRecentTrades = async () => {
      try {
        const response = await api.get('/trades/recent');
        setRecentTrades(response.data);
      } catch (error) {
        console.error('Error loading recent trades:', error);
      }
    };
    loadRecentTrades();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close/minimize
      if (e.key === 'Escape') {
        if (isOpen) {
          setIsMinimized(true);
        }
      }
      // Ctrl/Cmd + M to toggle widget
      if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
      // Enter to submit (when form is focused)
      if (e.key === 'Enter' && isOpen && !isMinimized) {
        const activeElement = document.activeElement;
        if (activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'SELECT') {
          e.preventDefault();
          handleSubmit();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isMinimized]);

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

    if (!formData.product) {
      newErrors.product = 'Product is required';
    }
    if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
      newErrors.quantity = 'Valid quantity is required';
    }
    if (formData.mode !== 'rfq' && (!formData.price || parseFloat(formData.price) <= 0)) {
      newErrors.price = 'Valid price is required';
    }
    if (formData.strategy === 'carry' && !formData.tenor) {
      newErrors.tenor = 'Tenor is required for carry trades';
    }
    if (formData.strategy === 'options') {
      if (!formData.strike || parseFloat(formData.strike) <= 0) {
        newErrors.strike = 'Valid strike price is required';
      }
      if (!formData.optionType) {
        newErrors.optionType = 'Option type is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        quantity: parseFloat(formData.quantity),
        price: formData.price ? parseFloat(formData.price) : undefined,
        strike: formData.strike ? parseFloat(formData.strike) : undefined,
        userId: user?.id
      };

      if (formData.mode === 'broadcast') {
        await api.post('/markets/broadcast', payload);
        websocketService.sendMarketBroadcast(payload);
      } else if (formData.mode === 'order') {
        await api.post('/orders', payload);
        websocketService.sendOrder(payload);
      } else if (formData.mode === 'rfq') {
        await api.post('/rfqs', payload);
        websocketService.sendRFQ(payload);
      }

      // Add to recent trades
      const newTrade: RecentTrade = {
        id: Date.now().toString(),
        product: formData.product,
        direction: formData.direction,
        quantity: parseFloat(formData.quantity),
        price: parseFloat(formData.price),
        timestamp: new Date()
      };
      setRecentTrades(prev => [newTrade, ...prev.slice(0, 4)]);

      // Reset form
      setFormData(prev => ({
        ...prev,
        quantity: '',
        price: '',
        specialInstructions: ''
      }));
      setErrors({});
    } catch (error) {
      console.error('Error submitting:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickRepeat = (trade: RecentTrade) => {
    setFormData(prev => ({
      ...prev,
      product: trade.product,
      direction: trade.direction,
      quantity: trade.quantity.toString(),
      price: trade.price.toString()
    }));
  };

  const getDirectionOptions = () => {
    if (formData.product.includes('Oil') || formData.product.includes('Gas')) {
      return ['BUY', 'SELL'];
    }
    return ['BUY', 'SELL', 'BORROW', 'LEND'];
  };

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-4 top-20 bg-blue-600 text-white p-3 rounded-lg shadow-lg hover:bg-blue-700 transition-colors z-40"
        title="Open Trading Widget (Ctrl+M)"
      >
        <ChevronLeftIcon className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className={`fixed right-0 top-16 h-[calc(100vh-4rem)] bg-white shadow-2xl transition-all duration-300 z-50 ${
      isMinimized ? 'w-12' : 'w-96'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        {!isMinimized && (
          <h3 className="text-lg font-semibold text-gray-900">Trading Widget</h3>
        )}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 rounded hover:bg-gray-200"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? <ChevronLeftIcon className="h-5 w-5" /> : <ChevronRightIcon className="h-5 w-5" />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded hover:bg-gray-200"
            title="Close (Esc)"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="flex flex-col h-[calc(100%-4rem)]">
          {/* Form */}
          <form ref={formRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Mode Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mode</label>
              <div className="grid grid-cols-3 gap-2">
                {(['broadcast', 'order', 'rfq'] as Mode[]).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleInputChange('mode', mode)}
                    className={`px-3 py-2 text-sm font-medium rounded-md ${
                      formData.mode === mode
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {mode.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Strategy Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Strategy</label>
              <div className="grid grid-cols-3 gap-2">
                {(['carry', 'outright', 'options'] as Strategy[]).map(strategy => (
                  <button
                    key={strategy}
                    type="button"
                    onClick={() => handleInputChange('strategy', strategy)}
                    className={`px-3 py-2 text-sm font-medium rounded-md capitalize ${
                      formData.strategy === strategy
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {strategy}
                  </button>
                ))}
              </div>
            </div>

            {/* Product */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
              <select
                value={formData.product}
                onChange={(e) => handleInputChange('product', e.target.value)}
                className={`w-full rounded-md border ${errors.product ? 'border-red-500' : 'border-gray-300'} px-3 py-2`}
              >
                {products.map(product => (
                  <option key={product} value={product}>{product}</option>
                ))}
              </select>
              {errors.product && <p className="text-red-500 text-xs mt-1">{errors.product}</p>}
            </div>

            {/* Direction */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Direction</label>
              <div className="grid grid-cols-2 gap-2">
                {getDirectionOptions().map(dir => (
                  <button
                    key={dir}
                    type="button"
                    onClick={() => handleInputChange('direction', dir)}
                    className={`px-3 py-2 text-sm font-medium rounded-md ${
                      formData.direction === dir
                        ? dir === 'BUY' || dir === 'BORROW'
                          ? 'bg-green-600 text-white'
                          : 'bg-red-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {dir}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => handleInputChange('quantity', e.target.value)}
                className={`w-full rounded-md border ${errors.quantity ? 'border-red-500' : 'border-gray-300'} px-3 py-2`}
                placeholder="Enter quantity"
              />
              {errors.quantity && <p className="text-red-500 text-xs mt-1">{errors.quantity}</p>}
            </div>

            {/* Price (not for RFQ mode) */}
            {formData.mode !== 'rfq' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', e.target.value)}
                  className={`w-full rounded-md border ${errors.price ? 'border-red-500' : 'border-gray-300'} px-3 py-2`}
                  placeholder="Enter price"
                />
                {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
              </div>
            )}

            {/* Tenor (for carry strategy) */}
            {formData.strategy === 'carry' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tenor</label>
                <select
                  value={formData.tenor}
                  onChange={(e) => handleInputChange('tenor', e.target.value)}
                  className={`w-full rounded-md border ${errors.tenor ? 'border-red-500' : 'border-gray-300'} px-3 py-2`}
                >
                  <option value="1M">1 Month</option>
                  <option value="2M">2 Months</option>
                  <option value="3M">3 Months</option>
                  <option value="6M">6 Months</option>
                  <option value="1Y">1 Year</option>
                </select>
                {errors.tenor && <p className="text-red-500 text-xs mt-1">{errors.tenor}</p>}
              </div>
            )}

            {/* Options fields */}
            {formData.strategy === 'options' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Option Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['CALL', 'PUT'] as const).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleInputChange('optionType', type)}
                        className={`px-3 py-2 text-sm font-medium rounded-md ${
                          formData.optionType === type
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                  {errors.optionType && <p className="text-red-500 text-xs mt-1">{errors.optionType}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Strike Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.strike}
                    onChange={(e) => handleInputChange('strike', e.target.value)}
                    className={`w-full rounded-md border ${errors.strike ? 'border-red-500' : 'border-gray-300'} px-3 py-2`}
                    placeholder="Enter strike price"
                  />
                  {errors.strike && <p className="text-red-500 text-xs mt-1">{errors.strike}</p>}
                </div>
              </>
            )}

            {/* Expiry Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {formData.mode === 'rfq' ? 'RFQ Expiry' : 'Prompt Date'}
              </label>
              <input
                type="date"
                value={formData.expiryDate}
                onChange={(e) => handleInputChange('expiryDate', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>

            {/* Special Instructions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions</label>
              <textarea
                value={formData.specialInstructions}
                onChange={(e) => handleInputChange('specialInstructions', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                rows={2}
                placeholder="Optional notes..."
              />
            </div>

            {/* Submit Button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`w-full py-3 px-4 rounded-md font-medium text-white transition-colors ${
                isSubmitting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isSubmitting ? 'Submitting...' : `Submit ${formData.mode.toUpperCase()}`}
            </button>
          </form>

          {/* Recent Trades */}
          <div className="border-t p-4 bg-gray-50">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Trades</h4>
            {recentTrades.length === 0 ? (
              <p className="text-xs text-gray-500">No recent trades</p>
            ) : (
              <div className="space-y-2">
                {recentTrades.map(trade => (
                  <button
                    key={trade.id}
                    onClick={() => handleQuickRepeat(trade)}
                    className="w-full text-left p-2 rounded bg-white hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{trade.product}</span>
                      <span className={`text-xs font-semibold ${
                        trade.direction === 'BUY' || trade.direction === 'BORROW'
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                        {trade.direction}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {trade.quantity.toLocaleString()} @ {trade.price.toFixed(2)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}