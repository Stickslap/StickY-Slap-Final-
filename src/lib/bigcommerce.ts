export const BIGCOMMERCE_CONFIG = {
  accessToken: process.env.BIGCOMMERCE_ACCESS_TOKEN || 'pamo87hvpikm2nz0iz5dammzgjb18gr',
  clientId: process.env.BIGCOMMERCE_CLIENT_ID || '3fw2jjpe110j1q48jtglyv589kwokrg',
  clientSecret: process.env.BIGCOMMERCE_CLIENT_SECRET || '40dd4f7ccc631dd1d7e5fd135b00fc66e2ca183afed201b1aebc9bba58481017',
  apiUrl: process.env.BIGCOMMERCE_API_URL || 'https://api.bigcommerce.com/stores/mcoyceqyzv/v3',
};

export async function fetchBigCommerceApi(endpoint: string, options: RequestInit & { version?: 'v2' | 'v3' } = {}) {
  const version = options.version || 'v3';
  const baseUrl = BIGCOMMERCE_CONFIG.apiUrl.replace(/\/v3\/?$/, `/${version}`);
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  const headers = {
    'X-Auth-Token': BIGCOMMERCE_CONFIG.accessToken,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Remove custom options before passing to fetch
  const fetchOptions = { ...options };
  delete fetchOptions.version;

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    let errorMsg = response.statusText;
    try {
      const errorBody = await response.json();
      errorMsg = JSON.stringify(errorBody);
    } catch (e) {
      // Ignore
    }
    throw new Error(`BigCommerce API error: ${response.status} ${errorMsg}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

export async function getBigCommerceProducts(params?: Record<string, string>) {
  const queryParams = new URLSearchParams(params || {});
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
  const result = await fetchBigCommerceApi(`/catalog/products${queryString}`);
  return result.data;
}

export async function createBigCommerceProduct(productData: any) {
  const result = await fetchBigCommerceApi('/catalog/products', {
    method: 'POST',
    body: JSON.stringify(productData),
  });
  return result.data;
}

export async function createBigCommerceOrder(orderData: any) {
  const result = await fetchBigCommerceApi('/orders', {
    method: 'POST',
    body: JSON.stringify(orderData),
    version: 'v2'
  });
  return result; // Order V2 doesn't always wrap in .data
}

export async function createBigCommerceCustomer(customerData: {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
}) {
  const result = await fetchBigCommerceApi('/customers', {
    method: 'POST',
    body: JSON.stringify([customerData]),
  });
  return result.data && result.data.length > 0 ? result.data[0] : null;
}

export async function getBigCommerceCustomerByEmail(email: string) {
  const result = await fetchBigCommerceApi(`/customers?email:in=${encodeURIComponent(email)}`);
  return result.data && result.data.length > 0 ? result.data[0] : null;
}
