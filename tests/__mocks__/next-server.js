/**
 * Mock implementation of next/server for testing environments
 * This allows tests to run without Next.js being installed
 */

class MockNextRequest {
  constructor(input, init = {}) {
    this.method = init.method || 'GET';
    this.url = input || 'http://localhost:3000/test';
    this.headers = new Map();
    this._body = init.body || null;
    
    // Set default headers
    if (init.headers) {
      if (init.headers instanceof Map) {
        this.headers = new Map(init.headers);
      } else if (typeof init.headers === 'object') {
        Object.entries(init.headers).forEach(([key, value]) => {
          this.headers.set(key, value);
        });
      }
    }
    
    this.nextUrl = new URL(this.url);
    this.cookies = new Map();
    this.geo = {};
    this.ip = '127.0.0.1';
  }
  
  async json() {
    if (this._body && typeof this._body === 'string') {
      return JSON.parse(this._body);
    }
    return this._body || {};
  }
  
  async text() {
    if (this._body && typeof this._body === 'object') {
      return JSON.stringify(this._body);
    }
    return this._body || '';
  }
  
  async formData() {
    return new FormData();
  }
  
  async arrayBuffer() {
    const text = await this.text();
    return new TextEncoder().encode(text).buffer;
  }
  
  clone() {
    return new MockNextRequest(this.url, {
      method: this.method,
      headers: this.headers,
      body: this._body
    });
  }
}

class MockNextResponse {
  constructor(body, init = {}) {
    this.status = init.status || 200;
    this.statusText = init.statusText || 'OK';
    this.headers = new Map();
    this.body = body;
    this.ok = this.status >= 200 && this.status < 300;
    this.redirected = false;
    this.type = 'basic';
    this.url = '';
    
    if (init.headers) {
      if (init.headers instanceof Map) {
        this.headers = new Map(init.headers);
      } else if (typeof init.headers === 'object') {
        Object.entries(init.headers).forEach(([key, value]) => {
          this.headers.set(key, value);
        });
      }
    }
    
    // Set default content-type for JSON responses
    if (typeof body === 'object' && !this.headers.has('content-type')) {
      this.headers.set('content-type', 'application/json');
    }
  }
  
  static json(data, init = {}) {
    const body = JSON.stringify(data);
    const headers = new Map(init.headers || []);
    headers.set('content-type', 'application/json');
    
    return new MockNextResponse(body, {
      ...init,
      headers
    });
  }
  
  static redirect(url, status = 302) {
    const headers = new Map();
    headers.set('location', url);
    
    return new MockNextResponse(null, {
      status,
      headers,
      statusText: 'Found'
    });
  }
  
  static notFound() {
    return new MockNextResponse('Not Found', {
      status: 404,
      statusText: 'Not Found'
    });
  }
  
  static error() {
    return new MockNextResponse('Internal Server Error', {
      status: 500,
      statusText: 'Internal Server Error'
    });
  }
  
  async json() {
    if (typeof this.body === 'string') {
      return JSON.parse(this.body);
    }
    return this.body;
  }
  
  async text() {
    if (typeof this.body === 'object') {
      return JSON.stringify(this.body);
    }
    return this.body || '';
  }
  
  async formData() {
    return new FormData();
  }
  
  async arrayBuffer() {
    const text = await this.text();
    return new TextEncoder().encode(text).buffer;
  }
  
  clone() {
    return new MockNextResponse(this.body, {
      status: this.status,
      statusText: this.statusText,
      headers: this.headers
    });
  }
}

// Mock NextUrl class
class MockNextUrl extends URL {
  constructor(input, base) {
    super(input, base);
    this.basePath = '';
    this.buildId = 'development';
    this.defaultLocale = 'en';
    this.domainLocale = undefined;
    this.locale = 'en';
    this.trailingSlash = false;
  }
  
  clone() {
    return new MockNextUrl(this.href);
  }
}

// Mock userAgent function
function userAgent(request) {
  const ua = request.headers.get('user-agent') || '';
  
  return {
    ua,
    browser: {
      name: 'Chrome',
      version: '91.0.4472.124'
    },
    device: {
      model: undefined,
      type: undefined,
      vendor: undefined
    },
    engine: {
      name: 'Blink',
      version: '91.0.4472.124'
    },
    os: {
      name: 'Mac OS',
      version: '10.15.7'
    },
    cpu: {
      architecture: 'amd64'
    }
  };
}

// Mock geolocation function
function geolocation(request) {
  return {
    country: 'US',
    region: 'CA',
    city: 'San Francisco',
    latitude: '37.7749',
    longitude: '-122.4194'
  };
}

// Mock ip function
function ipAddress(request) {
  return request.ip || '127.0.0.1';
}

module.exports = {
  NextRequest: MockNextRequest,
  NextResponse: MockNextResponse,
  NextURL: MockNextUrl,
  userAgent,
  geolocation,
  ipAddress
};