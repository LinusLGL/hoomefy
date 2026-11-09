# Hoomefy Technical Steering

**Purpose:** Technical standards, conventions, and architectural decisions for Hoomefy development.

## Technology Stack

### Frontend
- **Framework:** React 18+ with TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Components:** shadcn/ui
- **Animation:** Framer Motion
- **Icons:** Lucide React
- **State:** Zustand
- **API Client:** Axios + React Query
- **Routing:** React Router v6
- **Forms:** React Hook Form + Zod

### Backend
- **Runtime:** Node.js 18+ with TypeScript
- **Framework:** AWS Lambda (serverless)
- **Infrastructure:** AWS CDK
- **API:** Amazon API Gateway (REST)
- **Auth:** Amazon Cognito
- **Database:** Amazon DynamoDB
- **Storage:** Amazon S3
- **Queue:** Amazon SQS
- **AI:** Amazon Bedrock / Mock Provider
- **Logging:** Amazon CloudWatch

### Development Tools
- **Language:** TypeScript 5+
- **Linter:** ESLint
- **Formatter:** Prettier
- **Testing:** Vitest (frontend), Jest (backend), Playwright (E2E)
- **Git Hooks:** Husky (optional)
- **CI/CD:** GitHub Actions

## Code Style & Conventions

### TypeScript

**Strict Mode Enabled:**
```json
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true
}
```

**Prefer:**
- Explicit types over `any`
- Interfaces over type aliases for objects
- Type aliases for unions and primitives
- Enums for fixed sets of values

**Example:**
```typescript
// ✅ Good
interface User {
  id: string;
  email: string;
  name: string;
}

type RoomType = 'living-room' | 'bedroom' | 'kitchen';

// ❌ Avoid
const user: any = { ... };
```

### Naming Conventions

- **Files:** kebab-case (`user-profile.ts`, `auth-service.ts`)
- **Components:** PascalCase (`UserProfile.tsx`, `AuthForm.tsx`)
- **Functions:** camelCase (`getUserProfile`, `validateEmail`)
- **Constants:** UPPER_SNAKE_CASE (`API_BASE_URL`, `MAX_FILE_SIZE`)
- **Interfaces:** PascalCase with optional `I` prefix (`User` or `IUser`)
- **Types:** PascalCase (`RoomType`, `DesignStyle`)
- **Enums:** PascalCase (`JobStatus.Pending`)

### React Components

**Function Components Only:**
```typescript
// ✅ Good
export function UserProfile({ userId }: UserProfileProps) {
  const [user, setUser] = useState<User | null>(null);
  
  return <div>{user?.name}</div>;
}

// ❌ Avoid class components
```

**Props Typing:**
```typescript
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export function Button({ 
  label, 
  onClick, 
  variant = 'primary',
  disabled = false 
}: ButtonProps) {
  // ...
}
```

**Component Organization:**
```typescript
// 1. Imports
import { useState } from 'react';
import { Button } from '@/components/ui/button';

// 2. Types/Interfaces
interface MyComponentProps {
  // ...
}

// 3. Component
export function MyComponent({ ...props }: MyComponentProps) {
  // 4. Hooks
  const [state, setState] = useState();
  
  // 5. Derived state
  const computedValue = useMemo(() => ..., []);
  
  // 6. Effects
  useEffect(() => { ... }, []);
  
  // 7. Event handlers
  const handleClick = () => { ... };
  
  // 8. Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
}
```

### State Management

**Local State:** Use `useState` for component-specific state

**Global State:** Use Zustand for:
- Authentication state
- Design studio state
- UI preferences

**Server State:** Use React Query for:
- API data fetching
- Caching
- Background updates

**Example Zustand Store:**
```typescript
interface AuthState {
  user: User | null;
  tokens: Tokens | null;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  tokens: null,
  isAuthenticated: false,
  signIn: async (email, password) => {
    const { user, tokens } = await authService.signIn(email, password);
    set({ user, tokens, isAuthenticated: true });
  },
  signOut: () => {
    set({ user: null, tokens: null, isAuthenticated: false });
  },
}));
```

### API Design

**RESTful Conventions:**
- GET for retrieval
- POST for creation
- PATCH for partial updates
- DELETE for removal
- PUT avoided (use PATCH)

**Endpoint Structure:**
```
/api/resource              GET (list), POST (create)
/api/resource/:id          GET (retrieve), PATCH (update), DELETE (delete)
/api/resource/:id/action   POST (custom action)
```

**Response Structure:**
```typescript
// Success
{
  data: T,
  meta?: {
    cursor?: string,
    count?: number
  }
}

// Error
{
  error: {
    code: string,
    message: string,
    details?: object
  }
}
```

### Error Handling

**Frontend:**
```typescript
try {
  const data = await api.doSomething();
  // Handle success
} catch (error) {
  if (error.response?.status === 401) {
    // Handle unauthorized
  } else if (error.response?.status === 400) {
    // Handle validation error
    toast.error(error.response.data.error.message);
  } else {
    // Handle unexpected error
    toast.error('Something went wrong. Please try again.');
    console.error('Unexpected error:', error);
  }
}
```

**Backend:**
```typescript
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: object
  ) {
    super(message);
  }
}

// Usage
throw new AppError(400, 'INVALID_FILE_TYPE', 'Please upload a JPEG, PNG, or WebP image.');

// Lambda handler wrapper
export function withErrorHandler(handler: Handler): Handler {
  return async (event, context) => {
    try {
      return await handler(event, context);
    } catch (error) {
      if (error instanceof AppError) {
        return {
          statusCode: error.statusCode,
          body: JSON.stringify({
            error: {
              code: error.code,
              message: error.message,
              details: error.details
            }
          })
        };
      }
      // Log unexpected errors
      console.error('Unexpected error:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred.'
          }
        })
      };
    }
  };
}
```

### Testing Strategy

**Unit Tests:**
- Test utilities and services
- Mocked dependencies
- Fast, isolated tests

**Integration Tests:**
- Test API handlers with mocked AWS services
- Test React components with mocked API calls

**E2E Tests:**
- Test critical user flows
- Real browser interactions
- Slower, higher confidence

**Test Structure:**
```typescript
describe('AuthService', () => {
  describe('signIn', () => {
    it('should return user and tokens on success', async () => {
      // Arrange
      const mockResponse = { user: {...}, tokens: {...} };
      jest.spyOn(cognito, 'initiateAuth').mockResolvedValue(mockResponse);
      
      // Act
      const result = await authService.signIn('test@example.com', 'password');
      
      // Assert
      expect(result).toEqual(mockResponse);
      expect(cognito.initiateAuth).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'test@example.com' })
      );
    });
    
    it('should throw error on invalid credentials', async () => {
      // Arrange
      jest.spyOn(cognito, 'initiateAuth').mockRejectedValue(
        new Error('Invalid credentials')
      );
      
      // Act & Assert
      await expect(authService.signIn('wrong@example.com', 'wrong'))
        .rejects.toThrow('Invalid credentials');
    });
  });
});
```

## AWS Infrastructure Standards

### CDK Best Practices

**Stack Organization:**
- One concern per stack (Auth, API, Storage, Compute)
- Reusable constructs for common patterns
- Environment-specific configuration
- Explicit resource naming

**Resource Naming:**
```typescript
const bucket = new s3.Bucket(this, 'ImagesBucket', {
  bucketName: `hoomefy-images-${props.environment}-${this.account}`,
  // ...
});
```

**Outputs:**
```typescript
new cdk.CfnOutput(this, 'ApiUrl', {
  value: api.url,
  description: 'API Gateway URL',
  exportName: `hoomefy-${props.environment}-api-url`
});
```

### IAM Least Privilege

**Lambda Execution Role:**
```typescript
const lambdaRole = new iam.Role(this, 'LambdaRole', {
  assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
});

// Only grant specific actions on specific resources
table.grantReadWriteData(lambdaRole);
bucket.grantRead(lambdaRole);
```

### DynamoDB Design

**Single-Table Design:**
- PK: Entity identifier
- SK: Entity type or relation
- GSI1PK/GSI1SK: Inverted index for alternate access patterns

**Attribute Naming:**
- Use descriptive names (not abbreviations)
- ISO 8601 timestamps
- Consistent casing (camelCase)

**Example:**
```typescript
{
  PK: 'USER#123',
  SK: 'PROJECT#456',
  userId: '123',
  projectId: '456',
  name: 'Living Room Redesign',
  createdAt: '2026-11-05T10:30:00Z',
  GSI1PK: 'PROJECT#456',
  GSI1SK: 'USER#123'
}
```

### S3 Structure

**Folder Hierarchy:**
```
/uploads/{userId}/{projectId}/original.jpg
/uploads/{userId}/{projectId}/generated.jpg
/samples/style-name-example.jpg
```

**Object Metadata:**
- Use `x-amz-meta-*` headers
- Store user-id, project-id, image-type
- Set content-type correctly

## Environment Variables

### Frontend (.env)
```bash
VITE_API_URL=https://api.hoomefy.example.com
VITE_COGNITO_USER_POOL_ID=us-west-2_xxx
VITE_COGNITO_CLIENT_ID=xxx
VITE_ENABLE_HAUNTED=true
```

### Backend (Lambda Environment)
```bash
TABLE_NAME=HoomefyTable
BUCKET_NAME=hoomefy-images-prod-123456
QUEUE_URL=https://sqs.us-west-2.amazonaws.com/123456/hoomefy-jobs
IMAGE_PROVIDER=mock # or 'bedrock'
```

## Performance Guidelines

### Frontend

**Bundle Size:**
- Code splitting by route
- Lazy load components
- Tree-shake unused imports
- Target <200KB initial bundle

**Images:**
- Use WebP format
- Lazy load below fold
- Responsive images with srcset
- Blur-up placeholder

**React Optimization:**
```typescript
// Memoize expensive computations
const expensiveValue = useMemo(() => {
  return calculateExpensive(data);
}, [data]);

// Memoize callbacks passed to children
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);

// Memoize components that rarely change
export const ExpensiveComponent = React.memo(({ data }: Props) => {
  // ...
});
```

### Backend

**Lambda Optimization:**
- Reuse connections (DynamoDB, S3 clients)
- Minimize cold start (smaller bundle, no large deps in handler)
- Use async/await properly
- Stream large responses

**DynamoDB:**
- Use BatchGetItem for multiple items
- Use Query instead of Scan
- Paginate large result sets
- Use projection expressions

**S3:**
- Use presigned URLs instead of proxying
- Set appropriate cache headers
- Enable compression
- Use multipart upload for large files

## Security Checklist

- [ ] No secrets in code or git history
- [ ] Environment variables for all config
- [ ] S3 buckets private with encryption
- [ ] Cognito JWT validation on all protected routes
- [ ] Rate limiting on API endpoints
- [ ] Input validation (file type, size, dimensions)
- [ ] Output encoding (XSS prevention)
- [ ] CORS restricted to frontend domain
- [ ] HTTPS only
- [ ] Security headers (CSP, HSTS, X-Frame-Options)
- [ ] Dependencies regularly updated
- [ ] Least privilege IAM roles

## Git Workflow

**Branch Strategy:**
- `main`: Production-ready code
- `develop`: Integration branch
- `feature/*`: New features
- `fix/*`: Bug fixes

**Commit Messages:**
```
type(scope): short description

Longer explanation if needed.

Fixes #123
```

Types: feat, fix, docs, style, refactor, test, chore

**Example:**
```
feat(studio): add room type selector

Implemented dropdown component for selecting room type.
Updates studio store on change.

Closes #45
```

## Documentation Standards

**Code Comments:**
- Explain *why*, not *what*
- Document complex algorithms
- Add TSDoc for public APIs

**README Sections:**
1. Project overview
2. Features
3. Screenshots
4. Prerequisites
5. Installation
6. Configuration
7. Running locally
8. Deployment
9. Testing
10. Contributing
11. License

**API Documentation:**
- OpenAPI/Swagger spec
- Request/response examples
- Error codes explained

---

**Remember:** Write code for humans first, machines second. Prioritize readability and maintainability.
