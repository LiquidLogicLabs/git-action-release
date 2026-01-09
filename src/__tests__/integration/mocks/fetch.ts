/**
 * Mock helper for intercepting fetch calls
 */

export interface MockResponse {
  status: number;
  statusText?: string;
  data: any;
  headers?: Record<string, string>;
}

export interface MockRequest {
  url: string;
  method?: string;
  body?: any;
  headers?: Record<string, string> | Headers;
}

export type MockMatcher = string | RegExp | ((req: MockRequest) => boolean);

export class FetchMock {
  private responses: Map<string, MockResponse> = new Map();
  private calls: MockRequest[] = [];
  private originalFetch?: typeof fetch;
  private isSetup: boolean = false;
  private isMocked: boolean = false;

  /**
   * Setup the mock
   */
  setup(): void {
    // Clear previous state if setup was already called
    if (this.isSetup) {
      this.responses.clear();
      this.calls = [];
    }
    
    if (!this.originalFetch) {
      // Store the original fetch to restore later
      this.originalFetch = global.fetch;
    }
    
    // Replace global.fetch with our mock
    global.fetch = jest.fn((url: string | URL, options?: RequestInit) => {
      return this.handleFetch(url, options);
    }) as jest.MockedFunction<typeof fetch>;
    
    this.calls = [];
    this.isSetup = true;
    this.isMocked = true;
    
    // Safety: Verify fetch was actually replaced
    if (global.fetch === this.originalFetch) {
      throw new Error('Failed to mock global.fetch - this should never happen in tests');
    }
  }

  /**
   * Reset the mock
   */
  reset(): void {
    this.responses.clear();
    this.calls = [];
    this.isSetup = false;
    this.isMocked = false;
    
    // Only restore original fetch if we saved it and we actually replaced it
    if (this.originalFetch && global.fetch !== this.originalFetch) {
      global.fetch = this.originalFetch;
    }
    this.originalFetch = undefined;
    
    jest.clearAllMocks();
  }
  
  /**
   * Check if fetch is currently mocked
   */
  isCurrentlyMocked(): boolean {
    return this.isMocked && global.fetch !== this.originalFetch;
  }

  /**
   * Mock a response for a URL pattern
   */
  mockResponse(
    matcher: MockMatcher,
    response: MockResponse | ((req: MockRequest) => MockResponse)
  ): void {
    const key = this.getMatcherKey(matcher);
    if (typeof response === 'function') {
      // Store function directly - we'll call it during handleFetch
      this.responses.set(key, response as any);
    } else {
      this.responses.set(key, response);
    }
  }

  /**
   * Mock an error response
   */
  mockError(matcher: MockMatcher, status: number, message: string): void {
    this.mockResponse(matcher, {
      status,
      statusText: message,
      data: { message },
    });
  }

  /**
   * Mock a 404 response
   */
  mock404(matcher: MockMatcher): void {
    this.mockError(matcher, 404, 'Not Found');
  }

  /**
   * Get all calls made to fetch
   */
  getCalls(): MockRequest[] {
    return this.calls;
  }

  /**
   * Get the last call
   */
  getLastCall(): MockRequest | undefined {
    return this.calls[this.calls.length - 1];
  }

  /**
   * Check if a URL was called
   */
  wasCalled(matcher: MockMatcher): boolean {
    return this.calls.some((call) => this.matches(call.url, matcher));
  }

  /**
   * Handle fetch call
   */
  private async handleFetch(
    url: string | URL,
    options?: RequestInit
  ): Promise<Response> {
    const urlString = typeof url === 'string' ? url : url.toString();
    const method = options?.method || 'GET';
    
    // Parse body if present
    let body: any = undefined;
    if (options?.body) {
      if (typeof options.body === 'string') {
        try {
          body = JSON.parse(options.body);
        } catch {
          body = options.body;
        }
      } else {
        body = options.body;
      }
    }

    const request: MockRequest = {
      url: urlString,
      method,
      body,
      headers: options?.headers as Record<string, string> | Headers | undefined,
    };

    this.calls.push(request);

    // Find matching response
    const response = this.findResponse(request);
    if (!response) {
      // Safety check: If we're in a test environment and no mock is found,
      // this should throw an error to prevent real API calls
      const availableMatchers = Array.from(this.responses.keys()).join(', ');
      throw new Error(
        `No mock response found for ${method} ${urlString}. This indicates a missing mock - real API calls are not allowed in integration tests. Available matchers: ${availableMatchers || '(none)'}`
      );
    }

    const mockResponse =
      typeof response === 'function' ? response(request) : response;

    return this.createResponse(mockResponse);
  }

  /**
   * Find response for a request
   */
  private findResponse(request: MockRequest): MockResponse | ((req: MockRequest) => MockResponse) | undefined {
    for (const [key, response] of this.responses.entries()) {
      const matcher = this.parseMatcherKey(key);
      if (this.matchesRequest(request, matcher)) {
        return response;
      }
    }
    return undefined;
  }

  /**
   * Check if request matches matcher
   */
  private matchesRequest(request: MockRequest, matcher: MockMatcher): boolean {
    if (typeof matcher === 'string') {
      return request.url.includes(matcher);
    }
    if (matcher instanceof RegExp) {
      return matcher.test(request.url);
    }
    if (typeof matcher === 'function') {
      return matcher(request);
    }
    return false;
  }

  /**
   * Check if URL matches matcher
   */
  private matches(url: string, matcher: MockMatcher): boolean {
    if (typeof matcher === 'string') {
      return url.includes(matcher);
    }
    if (matcher instanceof RegExp) {
      return matcher.test(url);
    }
    return false;
  }

  /**
   * Get key for matcher
   */
  private getMatcherKey(matcher: MockMatcher): string {
    if (typeof matcher === 'string') {
      return `string:${matcher}`;
    }
    if (matcher instanceof RegExp) {
      return `regex:${matcher.source}`;
    }
    return `function:${matcher.toString()}`;
  }

  /**
   * Parse matcher key back to matcher
   */
  private parseMatcherKey(key: string): MockMatcher {
    if (key.startsWith('string:')) {
      return key.substring(7);
    }
    if (key.startsWith('regex:')) {
      return new RegExp(key.substring(6));
    }
    throw new Error(`Cannot parse matcher key: ${key}`);
  }

  /**
   * Create a Response object from mock data
   */
  private createResponse(mockResponse: MockResponse): Response {
    const headers = new Headers(mockResponse.headers || {});
    if (mockResponse.data && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const body =
      mockResponse.status === 204
        ? null
        : JSON.stringify(mockResponse.data);

    return new Response(body, {
      status: mockResponse.status,
      statusText: mockResponse.statusText || '',
      headers,
    });
  }
}

/**
 * Global fetch mock instance
 */
export const fetchMock = new FetchMock();
