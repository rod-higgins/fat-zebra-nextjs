// Mock implementation of next/server for tests
const mockNextServer = {
  NextRequest: jest.fn().mockImplementation((url, options) => ({
    url,
    method: options?.method || 'GET',
    headers: new Map(Object.entries(options?.headers || {})),
    json: jest.fn().mockResolvedValue({}),
    text: jest.fn().mockResolvedValue(''),
    ...options
  })),
  
  NextResponse: {
    json: jest.fn().mockImplementation((data, options) => ({
      json: () => Promise.resolve(data),
      status: options?.status || 200,
      headers: new Map(Object.entries(options?.headers || {})),
      ...data
    })),
    
    redirect: jest.fn().mockImplementation((url, status = 302) => ({
      status,
      headers: new Map([['Location', url]]),
      url
    })),
    
    rewrite: jest.fn().mockImplementation((url) => ({
      headers: new Map([['x-middleware-rewrite', url]]),
      url
    })),
    
    next: jest.fn().mockImplementation(() => ({
      headers: new Map(),
      status: 200
    }))
  },
  
  headers: jest.fn().mockReturnValue(new Map()),
  cookies: jest.fn().mockReturnValue(new Map()),
  
  // Mock for server-side utilities
  userAgent: jest.fn().mockReturnValue({
    isBot: false,
    browser: { name: 'Chrome' },
    device: { type: 'desktop' },
    engine: { name: 'Blink' },
    os: { name: 'Windows' },
    cpu: { architecture: 'amd64' }
  })
};

module.exports = mockNextServer;