# Hoomefy Testing Standards

**Purpose:** Testing strategy, standards, and best practices for Hoomefy.

## Testing Philosophy

1. **Test Behavior, Not Implementation:** Focus on what the code does, not how it does it
2. **Test User Flows:** Prioritize tests that mirror actual user interactions
3. **Fast Feedback:** Unit tests should run in milliseconds, integration tests in seconds
4. **Confidence Over Coverage:** 100% coverage doesn't guarantee quality; meaningful tests do
5. **Mock External Dependencies:** Control external services for reliable, fast tests

## Testing Pyramid

```
        /\
       /  \      E2E Tests (Few)
      /    \     - Critical user journeys
     /------\    - Real browser interactions
    /        \   
   /          \  Integration Tests (Some)
  /            \ - API handlers with mocked AWS
 /--------------\- Component tests with mocked APIs
/                \
------------------
   Unit Tests (Many)
   - Pure functions
   - Business logic
   - Utilities
```

## Frontend Testing

### Unit Tests (Vitest)

**Test utilities and hooks:**

```typescript
// frontend/src/utils/validation.test.ts
import { describe, it, expect } from 'vitest';
import { validateEmail, validatePassword } from './validation';

describe('validateEmail', () => {
  it('should return true for valid email', () => {
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('test.user+tag@domain.co.uk')).toBe(true);
  });
  
  it('should return false for invalid email', () => {
    expect(validateEmail('invalid')).toBe(false);
    expect(validateEmail('missing@domain')).toBe(false);
    expect(validateEmail('@nodomain.com')).toBe(false);
  });
});

describe('validatePassword', () => {
  it('should require minimum 8 characters', () => {
    expect(validatePassword('Short1')).toBe(false);
    expect(validatePassword('LongPass1')).toBe(true);
  });
  
  it('should require uppercase, lowercase, and digit', () => {
    expect(validatePassword('alllowercase1')).toBe(false);
    expect(validatePassword('ALLUPPERCASE1')).toBe(false);
    expect(validatePassword('NoDigitsHere')).toBe(false);
    expect(validatePassword('ValidPass1')).toBe(true);
  });
});
```

**Test React hooks:**

```typescript
// frontend/src/hooks/useImageUpload.test.ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useImageUpload } from './useImageUpload';

describe('useImageUpload', () => {
  it('should handle successful upload', async () => {
    const mockFile = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
    
    const { result } = renderHook(() => useImageUpload());
    
    await act(async () => {
      await result.current.upload(mockFile);
    });
    
    expect(result.current.isUploading).toBe(false);
    expect(result.current.uploadedImage).toBeDefined();
    expect(result.current.error).toBeNull();
  });
  
  it('should handle upload error', async () => {
    const invalidFile = new File([''], 'test.txt', { type: 'text/plain' });
    
    const { result } = renderHook(() => useImageUpload());
    
    await act(async () => {
      await result.current.upload(invalidFile);
    });
    
    expect(result.current.isUploading).toBe(false);
    expect(result.current.uploadedImage).toBeNull();
    expect(result.current.error).toContain('Invalid file type');
  });
});
```

### Component Tests (Vitest + React Testing Library)

**Test component rendering:**

```typescript
// frontend/src/components/ui/button.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './button';

describe('Button', () => {
  it('should render with label', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByRole('button', { name: 'Click Me' })).toBeInTheDocument();
  });
  
  it('should call onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
  
  it('should not call onClick when disabled', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick} disabled>Click Me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    
    expect(handleClick).not.toHaveBeenCalled();
  });
  
  it('should apply variant classes', () => {
    const { rerender } = render(<Button variant="primary">Button</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-amber');
    
    rerender(<Button variant="secondary">Button</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-purple');
  });
});
```

**Test components with API calls:**

```typescript
// frontend/src/components/gallery/ProjectGallery.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProjectGallery } from './ProjectGallery';
import * as projectsService from '@/services/projects';

// Mock the service
vi.mock('@/services/projects');

describe('ProjectGallery', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  
  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
  
  beforeEach(() => {
    queryClient.clear();
  });
  
  it('should display loading state', () => {
    vi.spyOn(projectsService, 'list').mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );
    
    render(<ProjectGallery />, { wrapper });
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
  
  it('should display projects when loaded', async () => {
    const mockProjects = [
      { projectId: '1', name: 'Living Room', style: 'modern-minimalist' },
      { projectId: '2', name: 'Bedroom', style: 'scandinavian' },
    ];
    
    vi.spyOn(projectsService, 'list').mockResolvedValue(mockProjects);
    
    render(<ProjectGallery />, { wrapper });
    
    await waitFor(() => {
      expect(screen.getByText('Living Room')).toBeInTheDocument();
      expect(screen.getByText('Bedroom')).toBeInTheDocument();
    });
  });
  
  it('should display error message on failure', async () => {
    vi.spyOn(projectsService, 'list').mockRejectedValue(
      new Error('Network error')
    );
    
    render(<ProjectGallery />, { wrapper });
    
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
  
  it('should display empty state when no projects', async () => {
    vi.spyOn(projectsService, 'list').mockResolvedValue([]);
    
    render(<ProjectGallery />, { wrapper });
    
    await waitFor(() => {
      expect(screen.getByText(/no projects yet/i)).toBeInTheDocument();
    });
  });
});
```

### E2E Tests (Playwright)

**Test critical user flows:**

```typescript
// frontend/tests/e2e/generation-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Generation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
  });
  
  test('should complete full generation flow', async ({ page }) => {
    // Navigate to studio
    await page.getByRole('link', { name: /design my room/i }).click();
    
    // Sign in (assuming already registered)
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('TestPass123');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Upload image
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles('./tests/fixtures/living-room.jpg');
    
    // Wait for upload to complete
    await expect(page.getByRole('img', { name: /preview/i })).toBeVisible();
    
    // Select room type
    await page.getByRole('button', { name: /living room/i }).click();
    
    // Select style
    await page.getByRole('button', { name: /modern minimalist/i }).click();
    
    // Generate design
    await page.getByRole('button', { name: /generate design/i }).click();
    
    // Wait for generation (with timeout)
    await expect(page.getByText(/generating/i)).toBeVisible();
    await expect(page.getByText(/your design is ready/i)).toBeVisible({
      timeout: 60000,
    });
    
    // Verify before/after comparison is visible
    await expect(page.getByRole('img', { name: /generated/i })).toBeVisible();
    
    // Save to gallery
    await page.getByRole('button', { name: /save/i }).click();
    await page.getByLabel(/project name/i).fill('My Living Room');
    await page.getByRole('button', { name: /confirm/i }).click();
    
    // Navigate to gallery
    await page.getByRole('link', { name: /my designs/i }).click();
    
    // Verify project is in gallery
    await expect(page.getByText('My Living Room')).toBeVisible();
  });
  
  test('should handle upload error gracefully', async ({ page }) => {
    await page.goto('http://localhost:5173/studio');
    
    // Try to upload invalid file
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles('./tests/fixtures/document.pdf');
    
    // Should show error message
    await expect(page.getByText(/invalid file type/i)).toBeVisible();
  });
  
  test('should toggle haunted mode', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Check haunted effects are visible
    await expect(page.locator('.haunted-overlay')).toBeVisible();
    
    // Toggle to normal mode
    await page.getByRole('button', { name: /normal mode/i }).click();
    
    // Haunted effects should be hidden
    await expect(page.locator('.haunted-overlay')).not.toBeVisible();
  });
});
```

## Backend Testing

### Unit Tests (Jest)

**Test services:**

```typescript
// backend/src/services/storage/DynamoDBService.test.ts
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { DynamoDBService } from './DynamoDBService';
import { DynamoDBClient, PutItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';

jest.mock('@aws-sdk/client-dynamodb');

describe('DynamoDBService', () => {
  let service: DynamoDBService;
  let mockClient: jest.Mocked<DynamoDBClient>;
  
  beforeEach(() => {
    mockClient = new DynamoDBClient({}) as jest.Mocked<DynamoDBClient>;
    service = new DynamoDBService();
    (service as any).client = mockClient;
  });
  
  describe('putItem', () => {
    it('should put item to DynamoDB', async () => {
      mockClient.send.mockResolvedValue({});
      
      await service.putItem({
        PK: 'USER#123',
        SK: 'PROFILE',
        email: 'test@example.com',
      });
      
      expect(mockClient.send).toHaveBeenCalledWith(
        expect.any(PutItemCommand)
      );
    });
  });
  
  describe('getItem', () => {
    it('should get item from DynamoDB', async () => {
      const mockItem = {
        PK: { S: 'USER#123' },
        SK: { S: 'PROFILE' },
        email: { S: 'test@example.com' },
      };
      
      mockClient.send.mockResolvedValue({ Item: mockItem });
      
      const result = await service.getItem({
        PK: 'USER#123',
        SK: 'PROFILE',
      });
      
      expect(result).toEqual({
        PK: 'USER#123',
        SK: 'PROFILE',
        email: 'test@example.com',
      });
    });
    
    it('should return null if item not found', async () => {
      mockClient.send.mockResolvedValue({});
      
      const result = await service.getItem({
        PK: 'USER#999',
        SK: 'PROFILE',
      });
      
      expect(result).toBeNull();
    });
  });
});
```

**Test prompt generation:**

```typescript
// backend/src/utils/prompts.test.ts
import { describe, it, expect } from '@jest/globals';
import { generatePrompt } from './prompts';

describe('generatePrompt', () => {
  it('should generate prompt for modern minimalist style', () => {
    const prompt = generatePrompt({
      roomType: 'living-room',
      style: 'modern-minimalist',
      preferences: {
        colorPalette: 'neutral',
        intensity: 0.7,
      },
    });
    
    expect(prompt).toContain('modern minimalist');
    expect(prompt).toContain('living room');
    expect(prompt).toContain('neutral');
    expect(prompt).toContain('PRESERVE');
    expect(prompt).toContain('CHANGE');
  });
  
  it('should include custom instructions', () => {
    const prompt = generatePrompt({
      roomType: 'bedroom',
      style: 'scandinavian',
      preferences: {
        customInstructions: 'Add more natural light',
      },
    });
    
    expect(prompt).toContain('Add more natural light');
  });
  
  it('should preserve architectural elements', () => {
    const prompt = generatePrompt({
      roomType: 'kitchen',
      style: 'industrial',
      preferences: {},
    });
    
    expect(prompt).toContain('room dimensions');
    expect(prompt).toContain('window locations');
    expect(prompt).toContain('door placement');
    expect(prompt).toContain('camera perspective');
  });
});
```

### Integration Tests

**Test API handlers:**

```typescript
// backend/src/handlers/api/projects.test.ts
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { listProjects } from './projects';
import * as dynamodbService from '@/services/storage/DynamoDBService';
import * as authMiddleware from '@/middleware/auth';

jest.mock('@/services/storage/DynamoDBService');
jest.mock('@/middleware/auth');

describe('listProjects handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should return user projects', async () => {
    const mockProjects = [
      { projectId: '1', name: 'Project 1' },
      { projectId: '2', name: 'Project 2' },
    ];
    
    jest.spyOn(authMiddleware, 'authenticate').mockReturnValue('user-123');
    jest.spyOn(dynamodbService.DynamoDBService.prototype, 'queryProjects')
      .mockResolvedValue(mockProjects);
    
    const event = {
      headers: { Authorization: 'Bearer valid-token' },
    } as APIGatewayProxyEvent;
    
    const result = await listProjects(event);
    
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.projects).toEqual(mockProjects);
  });
  
  it('should return 401 if not authenticated', async () => {
    jest.spyOn(authMiddleware, 'authenticate').mockImplementation(() => {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing token');
    });
    
    const event = {
      headers: {},
    } as APIGatewayProxyEvent;
    
    const result = await listProjects(event);
    
    expect(result.statusCode).toBe(401);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });
});
```

**Test generation worker:**

```typescript
// backend/src/handlers/workers/generationWorker.test.ts
import { describe, it, expect, jest } from '@jest/globals';
import { SQSEvent } from 'aws-lambda';
import { handler } from './generationWorker';
import * as imageGeneration from '@/services/imageGeneration/MockProvider';
import * as s3Service from '@/services/storage/S3Service';
import * as dynamodbService from '@/services/storage/DynamoDBService';

jest.mock('@/services/imageGeneration/MockProvider');
jest.mock('@/services/storage/S3Service');
jest.mock('@/services/storage/DynamoDBService');

describe('generationWorker', () => {
  it('should process generation job successfully', async () => {
    const mockJob = {
      jobId: 'job-123',
      userId: 'user-123',
      projectId: 'project-123',
      originalImageKey: 'uploads/user-123/project-123/original.jpg',
      roomType: 'living-room',
      style: 'modern-minimalist',
      preferences: {},
    };
    
    const mockGeneratedImage = Buffer.from('generated-image-data');
    
    jest.spyOn(dynamodbService.DynamoDBService.prototype, 'getItem')
      .mockResolvedValue(mockJob);
    jest.spyOn(s3Service.S3Service.prototype, 'downloadImage')
      .mockResolvedValue(Buffer.from('original-image'));
    jest.spyOn(imageGeneration.MockProvider.prototype, 'generateTransformation')
      .mockResolvedValue({ imageData: mockGeneratedImage, format: 'jpeg' });
    jest.spyOn(s3Service.S3Service.prototype, 'uploadImage')
      .mockResolvedValue('uploads/user-123/project-123/generated.jpg');
    jest.spyOn(dynamodbService.DynamoDBService.prototype, 'updateItem')
      .mockResolvedValue(undefined);
    
    const event: SQSEvent = {
      Records: [
        {
          messageId: 'msg-123',
          body: JSON.stringify({ jobId: 'job-123' }),
          // ... other SQS fields
        },
      ],
    } as any;
    
    await handler(event);
    
    expect(dynamodbService.DynamoDBService.prototype.updateItem)
      .toHaveBeenCalledWith(expect.objectContaining({
        status: 'completed',
        generatedImageKey: expect.any(String),
      }));
  });
  
  it('should handle generation failure', async () => {
    jest.spyOn(imageGeneration.MockProvider.prototype, 'generateTransformation')
      .mockRejectedValue(new Error('Generation failed'));
    
    const event: SQSEvent = {
      Records: [
        {
          messageId: 'msg-123',
          body: JSON.stringify({ jobId: 'job-123' }),
        },
      ],
    } as any;
    
    await handler(event);
    
    expect(dynamodbService.DynamoDBService.prototype.updateItem)
      .toHaveBeenCalledWith(expect.objectContaining({
        status: 'failed',
        errorMessage: 'Generation failed',
      }));
  });
});
```

## Test Configuration

### Vitest Config

```typescript
// frontend/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
      ],
    },
  },
});
```

### Jest Config

```javascript
// backend/jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
```

### Playwright Config

```typescript
// frontend/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

## Testing Best Practices

### Do's

✅ **Test user-visible behavior:**
```typescript
// Good
expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();

// Avoid
expect(component.state.isSubmitting).toBe(false);
```

✅ **Use meaningful test descriptions:**
```typescript
// Good
it('should display error message when upload fails', ...);

// Avoid
it('works', ...);
```

✅ **Arrange-Act-Assert pattern:**
```typescript
it('should increment counter', () => {
  // Arrange
  render(<Counter initialValue={0} />);
  
  // Act
  fireEvent.click(screen.getByRole('button', { name: '+' }));
  
  // Assert
  expect(screen.getByText('1')).toBeInTheDocument();
});
```

✅ **Mock external dependencies:**
```typescript
vi.mock('@/services/api');
```

✅ **Clean up after tests:**
```typescript
afterEach(() => {
  vi.clearAllMocks();
  queryClient.clear();
});
```

### Don'ts

❌ **Don't test implementation details:**
```typescript
// Bad
expect(component.find('.internal-class')).toExist();

// Good
expect(screen.getByText('Visible text')).toBeInTheDocument();
```

❌ **Don't make tests dependent on each other:**
```typescript
// Bad - tests share state
let sharedData;
it('test 1', () => { sharedData = ...; });
it('test 2', () => { use(sharedData); });
```

❌ **Don't use fixed timeouts:**
```typescript
// Bad
await new Promise(resolve => setTimeout(resolve, 1000));

// Good
await waitFor(() => expect(...).toBeVisible());
```

❌ **Don't test third-party libraries:**
```typescript
// Don't test that React Router works
// Don't test that Axios makes requests
// Do test YOUR integration with them
```

## Running Tests

```bash
# Frontend unit tests
cd frontend
npm run test

# Frontend unit tests with coverage
npm run test:coverage

# Frontend E2E tests
npm run test:e2e

# Backend unit tests
cd backend
npm run test

# Backend unit tests with coverage
npm run test:coverage

# Run all tests
npm run test:all
```

## CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd frontend && npm ci
          cd ../backend && npm ci
      
      - name: Run frontend tests
        run: cd frontend && npm run test:coverage
      
      - name: Run backend tests
        run: cd backend && npm run test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

**Remember:** Good tests give you confidence to refactor and ship faster. Invest in testing early.
