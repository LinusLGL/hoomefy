# Hoomefy Project Structure

**Purpose:** Define and maintain consistent project organization and file structure.

## Root Structure

```
hoomefy/
├── .kiro/                      # Kiro configuration and specs
│   ├── specs/                  # Requirements, design, tasks
│   ├── steering/               # Development guidelines
│   └── hooks/                  # Agent automation hooks
├── frontend/                   # React application
├── backend/                    # AWS Lambda + CDK
├── docs/                       # Additional documentation
├── .github/                    # GitHub workflows
├── .gitignore
├── LICENSE
└── README.md
```

## Frontend Structure

```
frontend/
├── public/
│   ├── images/
│   │   ├── samples/           # Before/after demo images
│   │   ├── styles/            # Style preview cards
│   │   └── mori/              # Ghost mascot assets
│   └── favicon.ico
├── src/
│   ├── components/            # React components
│   │   ├── ui/               # shadcn/ui primitives
│   │   ├── layout/           # Header, Footer, Navigation
│   │   ├── landing/          # Homepage sections
│   │   ├── studio/           # Design studio components
│   │   ├── upload/           # Photo upload components
│   │   ├── comparison/       # Before/after viewers
│   │   ├── gallery/          # Project gallery
│   │   ├── auth/             # Authentication forms
│   │   └── haunted/          # Supernatural effects
│   ├── pages/                # Route pages
│   ├── hooks/                # Custom React hooks
│   ├── services/             # API and external services
│   ├── stores/               # Zustand state stores
│   ├── types/                # TypeScript type definitions
│   ├── utils/                # Utility functions
│   ├── styles/               # Global CSS
│   ├── App.tsx               # Root component
│   └── main.tsx              # Entry point
├── tests/                    # Test files
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── .env.example
```

## Backend Structure

```
backend/
├── infrastructure/            # AWS CDK
│   ├── bin/
│   │   └── hoomefy.ts        # CDK app entry
│   ├── lib/
│   │   ├── stacks/           # CDK stacks
│   │   │   ├── HoomefyStack.ts
│   │   │   ├── AuthStack.ts
│   │   │   ├── ApiStack.ts
│   │   │   ├── StorageStack.ts
│   │   │   └── ComputeStack.ts
│   │   └── constructs/       # Reusable CDK constructs
│   ├── cdk.json
│   └── package.json
├── src/
│   ├── handlers/             # Lambda function handlers
│   │   ├── auth/            # Cognito triggers
│   │   ├── api/             # API endpoints
│   │   └── workers/         # Background workers
│   ├── services/            # Business logic services
│   │   ├── imageGeneration/ # AI providers
│   │   ├── storage/         # S3, DynamoDB services
│   │   ├── auth/            # Cognito service
│   │   └── queue/           # SQS service
│   ├── models/              # Data models
│   ├── utils/               # Utility functions
│   ├── middleware/          # Lambda middleware
│   └── types/               # TypeScript types
├── tests/                   # Test files
├── package.json
├── tsconfig.json
└── .env.example
```

## Component Organization

### UI Components (shadcn/ui)

Located in `frontend/src/components/ui/`:
- button.tsx
- input.tsx
- card.tsx
- dialog.tsx
- select.tsx
- toast.tsx
- slider.tsx
- etc.

These are installed via shadcn CLI and customized for Hoomefy theme.

### Feature Components

Group by feature/domain:

```
components/
├── landing/
│   ├── Hero.tsx              # Hero section
│   ├── StyleShowcase.tsx     # Style cards grid
│   ├── HowItWorks.tsx        # Workflow explanation
│   └── SampleGallery.tsx     # Demo transformations
├── studio/
│   ├── DesignStudio.tsx      # Main studio container
│   ├── ControlPanel.tsx      # Left panel: controls
│   ├── ImageViewer.tsx       # Center panel: image
│   ├── MoriAssistant.tsx     # Right panel: ghost guide
│   └── GenerationProgress.tsx # Loading overlay
└── comparison/
    ├── BeforeAfter.tsx       # Comparison container
    ├── SliderComparison.tsx  # Draggable slider
    └── SideBySide.tsx        # Two-column view
```

## Service Layer Pattern

### Frontend Services

```typescript
// frontend/src/services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Add auth interceptor
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().tokens?.idToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

```typescript
// frontend/src/services/projects.ts
import api from './api';
import type { Project, CreateProjectRequest } from '@/types';

export const projectsService = {
  async list(): Promise<Project[]> {
    const { data } = await api.get('/api/projects');
    return data.projects;
  },
  
  async get(id: string): Promise<Project> {
    const { data } = await api.get(`/api/projects/${id}`);
    return data;
  },
  
  async update(id: string, updates: Partial<Project>): Promise<Project> {
    const { data } = await api.patch(`/api/projects/${id}`, updates);
    return data;
  },
  
  async delete(id: string): Promise<void> {
    await api.delete(`/api/projects/${id}`);
  },
};
```

### Backend Services

```typescript
// backend/src/services/storage/DynamoDBService.ts
import { DynamoDBClient, PutItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

export class DynamoDBService {
  private client: DynamoDBClient;
  private tableName: string;
  
  constructor() {
    this.client = new DynamoDBClient({});
    this.tableName = process.env.TABLE_NAME!;
  }
  
  async putItem(item: Record<string, any>): Promise<void> {
    await this.client.send(new PutItemCommand({
      TableName: this.tableName,
      Item: marshall(item),
    }));
  }
  
  async getItem(key: Record<string, any>): Promise<Record<string, any> | null> {
    const result = await this.client.send(new GetItemCommand({
      TableName: this.tableName,
      Key: marshall(key),
    }));
    
    return result.Item ? unmarshall(result.Item) : null;
  }
}
```

## Type Definitions

### Shared Types

Define in both frontend and backend (or use shared package):

```typescript
// types/design.ts
export type RoomType = 
  | 'living-room' 
  | 'bedroom' 
  | 'kitchen' 
  | 'dining-room' 
  | 'office' 
  | 'bathroom' 
  | 'other';

export type DesignStyle = 
  | 'modern-minimalist'
  | 'scandinavian'
  | 'japandi'
  | 'contemporary-luxury'
  | 'industrial'
  | 'bohemian'
  | 'mid-century-modern'
  | 'coastal'
  | 'modern-classic'
  | 'haunted-chic';

export interface DesignPreferences {
  colorPalette?: 'warm' | 'cool' | 'neutral' | 'bold';
  intensity?: number; // 0.0 - 1.0
  customInstructions?: string;
}

export interface Project {
  projectId: string;
  userId: string;
  name: string;
  roomType: RoomType;
  style: DesignStyle;
  preferences: DesignPreferences;
  originalImageKey: string;
  generatedImageKey: string;
  originalImageUrl?: string; // Presigned URL
  generatedImageUrl?: string; // Presigned URL
  createdAt: string;
  updatedAt: string;
}

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface GenerationJob {
  jobId: string;
  userId: string;
  projectId: string;
  status: JobStatus;
  originalImageKey: string;
  generatedImageKey: string | null;
  roomType: RoomType;
  style: DesignStyle;
  preferences: DesignPreferences;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}
```

## Lambda Handler Pattern

### Standard Handler Structure

```typescript
// backend/src/handlers/api/projects.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBService } from '@/services/storage/DynamoDBService';
import { authenticate } from '@/middleware/auth';
import { AppError } from '@/utils/errors';

const dynamodb = new DynamoDBService();

export async function listProjects(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    // Authenticate and get userId
    const userId = authenticate(event);
    
    // Fetch projects
    const projects = await dynamodb.queryProjects(userId);
    
    // Return success response
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ projects }),
    };
  } catch (error) {
    // Handle errors
    if (error instanceof AppError) {
      return {
        statusCode: error.statusCode,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: {
            code: error.code,
            message: error.message,
          },
        }),
      };
    }
    
    console.error('Unexpected error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred.',
        },
      }),
    };
  }
}
```

## CDK Stack Pattern

### Modular Stack Organization

```typescript
// backend/infrastructure/lib/stacks/StorageStack.ts
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export interface StorageStackProps extends cdk.StackProps {
  environment: string;
}

export class StorageStack extends cdk.Stack {
  public readonly imagesBucket: s3.Bucket;
  public readonly table: dynamodb.Table;
  
  constructor(scope: Construct, id: string, props: StorageStackProps) {
    super(scope, id, props);
    
    // S3 Bucket for images
    this.imagesBucket = new s3.Bucket(this, 'ImagesBucket', {
      bucketName: `hoomefy-images-${props.environment}-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
          allowedOrigins: ['*'], // Restrict in production
          allowedHeaders: ['*'],
        },
      ],
      lifecycleRules: [
        {
          enabled: true,
          expiration: cdk.Duration.days(90),
        },
      ],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    
    // DynamoDB Table
    this.table = new dynamodb.Table(this, 'Table', {
      tableName: `Hoomefy-${props.environment}`,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    
    // Global Secondary Index
    this.table.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
    });
    
    // Outputs
    new cdk.CfnOutput(this, 'BucketName', {
      value: this.imagesBucket.bucketName,
    });
    
    new cdk.CfnOutput(this, 'TableName', {
      value: this.table.tableName,
    });
  }
}
```

## Testing Structure

### Test File Colocation

```
src/
├── components/
│   ├── Button.tsx
│   └── Button.test.tsx        # Next to component
├── services/
│   ├── api.ts
│   └── api.test.ts            # Next to service
└── utils/
    ├── validation.ts
    └── validation.test.ts     # Next to utility
```

### Test Organization

```typescript
// Component test structure
describe('Button', () => {
  describe('rendering', () => {
    it('should render label', () => { ... });
    it('should apply variant class', () => { ... });
  });
  
  describe('interactions', () => {
    it('should call onClick when clicked', () => { ... });
    it('should not call onClick when disabled', () => { ... });
  });
  
  describe('accessibility', () => {
    it('should have proper ARIA attributes', () => { ... });
    it('should be keyboard navigable', () => { ... });
  });
});
```

## File Naming Conventions

- **React Components:** PascalCase.tsx (`Button.tsx`, `UserProfile.tsx`)
- **Hooks:** camelCase.ts with 'use' prefix (`useAuth.ts`, `useImageUpload.ts`)
- **Services:** camelCase.ts (`api.ts`, `authService.ts`)
- **Utils:** camelCase.ts (`validation.ts`, `formatters.ts`)
- **Types:** camelCase.ts or descriptive (`types.ts`, `api-types.ts`)
- **Tests:** Same name with `.test.ts` or `.spec.ts` suffix
- **Styles:** kebab-case.css (`globals.css`, `button-styles.css`)

## Import Path Aliases

Configure in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/components/*": ["src/components/*"],
      "@/hooks/*": ["src/hooks/*"],
      "@/services/*": ["src/services/*"],
      "@/types/*": ["src/types/*"],
      "@/utils/*": ["src/utils/*"]
    }
  }
}
```

Usage:
```typescript
// ❌ Avoid relative imports
import { Button } from '../../../components/ui/Button';

// ✅ Use path aliases
import { Button } from '@/components/ui/Button';
```

## Documentation Structure

```
docs/
├── architecture.md           # System architecture overview
├── api/                     # API documentation
│   ├── authentication.md
│   ├── projects.md
│   └── generations.md
├── deployment.md            # Deployment guide
├── development.md           # Local development setup
├── testing.md              # Testing guide
└── troubleshooting.md      # Common issues and solutions
```

---

**Remember:** Consistent structure makes code easier to navigate, understand, and maintain. Follow these patterns throughout development.
