# Hoomefy Design Specification

**Project:** Hoomefy - AI Home Decoration Application  
**Version:** 1.0.0  
**Last Updated:** November 5, 2026

## Architecture Overview

Hoomefy follows a serverless, event-driven architecture built entirely on AWS managed services. The system separates concerns between frontend presentation, API layer, asynchronous processing, and storage.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                                 │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    React Frontend                              │  │
│  │  (Vite + TypeScript + Tailwind + shadcn/ui)                   │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────┬───────────────────────────┬─────────────────────┘
                  │                             │
                  │ HTTPS                       │ Presigned URLs
                  │                             │
       ┌──────────▼─────────────┐    ┌─────────▼──────────┐
       │  Amazon API Gateway    │    │    Amazon S3       │
       │  (REST API)            │    │  (Image Storage)   │
       └──────────┬─────────────┘    └────────────────────┘
                  │                             
                  │ Invokes                     
                  │                             
       ┌──────────▼─────────────────────────────────────┐
       │           AWS Lambda Functions                  │
       │  ┌──────────────┐  ┌──────────────┐           │
       │  │  API Layer   │  │  Generation  │           │
       │  │  Handlers    │  │  Worker      │           │
       │  └──────┬───────┘  └──────┬───────┘           │
       └─────────┼──────────────────┼───────────────────┘
                 │                  │
        ┌────────▼─────────┐  ┌────▼──────────────────┐
        │  Amazon DynamoDB │  │  Amazon SQS           │
        │  (Projects, Jobs)│  │  (Job Queue)          │
        └──────────────────┘  └───────────────────────┘
                                       │
                              ┌────────▼────────────────┐
                              │  Amazon Bedrock         │
                              │  (AI Image Generation)  │
                              │  or Mock Provider       │
                              └─────────────────────────┘
                                       
       ┌─────────────────────────────────────────────────┐
       │         Amazon Cognito                          │
       │      (Authentication & User Management)         │
       └─────────────────────────────────────────────────┘

       ┌─────────────────────────────────────────────────┐
       │       Amazon CloudWatch                         │
       │      (Logs, Metrics, Alarms)                    │
       └─────────────────────────────────────────────────┘
```

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React 18+ with TypeScript
- Vite for build tooling and dev server
- Tailwind CSS for styling
- shadcn/ui component library
- Framer Motion for animations
- Zustand or React Context for state management
- React Router for navigation
- Axios for API communication
- React Query for server state management

**Directory Structure:**
```
frontend/
├── public/
│   ├── images/
│   │   ├── samples/          # Before/after demo images
│   │   ├── styles/           # Style preview images
│   │   └── mori/             # Ghost mascot assets
│   └── favicon.ico
├── src/
│   ├── components/
│   │   ├── ui/               # shadcn/ui components
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── Navigation.tsx
│   │   ├── landing/
│   │   │   ├── Hero.tsx
│   │   │   ├── HowItWorks.tsx
│   │   │   ├── StyleShowcase.tsx
│   │   │   └── SampleGallery.tsx
│   │   ├── studio/
│   │   │   ├── DesignStudio.tsx
│   │   │   ├── ControlPanel.tsx
│   │   │   ├── ImageViewer.tsx
│   │   │   ├── MoriAssistant.tsx
│   │   │   └── GenerationProgress.tsx
│   │   ├── upload/
│   │   │   ├── PhotoUpload.tsx
│   │   │   ├── CameraCapture.tsx
│   │   │   └── ImagePreview.tsx
│   │   ├── comparison/
│   │   │   ├── BeforeAfter.tsx
│   │   │   ├── SliderComparison.tsx
│   │   │   └── SideBySide.tsx
│   │   ├── gallery/
│   │   │   ├── ProjectGallery.tsx
│   │   │   ├── ProjectCard.tsx
│   │   │   └── ProjectDetail.tsx
│   │   ├── auth/
│   │   │   ├── SignIn.tsx
│   │   │   ├── SignUp.tsx
│   │   │   └── ForgotPassword.tsx
│   │   └── haunted/
│   │       ├── HauntedOverlay.tsx
│   │       ├── FloatingParticles.tsx
│   │       ├── MagicalButton.tsx
│   │       └── TransformationRitual.tsx
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── DesignStudioPage.tsx
│   │   ├── GalleryPage.tsx
│   │   ├── HowItWorksPage.tsx
│   │   ├── AboutPage.tsx
│   │   └── NotFoundPage.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useImageUpload.ts
│   │   ├── useGeneration.ts
│   │   ├── useProjects.ts
│   │   └── useHauntedMode.ts
│   ├── services/
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   ├── storage.ts
│   │   └── imageProcessing.ts
│   ├── stores/
│   │   ├── authStore.ts
│   │   ├── studioStore.ts
│   │   └── uiStore.ts
│   ├── types/
│   │   ├── api.ts
│   │   ├── design.ts
│   │   ├── project.ts
│   │   └── user.ts
│   ├── utils/
│   │   ├── constants.ts
│   │   ├── validation.ts
│   │   └── formatters.ts
│   ├── styles/
│   │   └── globals.css
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
└── .env.example
```

### Backend Architecture

**Technology Stack:**
- AWS Lambda (Node.js 18+ with TypeScript)
- AWS CDK for infrastructure
- Amazon API Gateway (REST API)
- Amazon DynamoDB (Single-table design)
- Amazon S3 (Image storage)
- Amazon SQS (Job queue)
- Amazon Cognito (Authentication)
- Amazon Bedrock (AI generation)

**Directory Structure:**
```
backend/
├── infrastructure/
│   ├── lib/
│   │   ├── stacks/
│   │   │   ├── HoomefyStack.ts
│   │   │   ├── AuthStack.ts
│   │   │   ├── ApiStack.ts
│   │   │   ├── StorageStack.ts
│   │   │   └── ComputeStack.ts
│   │   └── constructs/
│   │       ├── LambdaFunction.ts
│   │       └── ApiEndpoint.ts
│   ├── bin/
│   │   └── hoomefy.ts
│   ├── cdk.json
│   └── package.json
├── src/
│   ├── handlers/
│   │   ├── auth/
│   │   │   └── postConfirmation.ts
│   │   ├── api/
│   │   │   ├── uploads.ts
│   │   │   ├── generations.ts
│   │   │   ├── projects.ts
│   │   │   ├── account.ts
│   │   │   └── usage.ts
│   │   └── workers/
│   │       └── generationWorker.ts
│   ├── services/
│   │   ├── imageGeneration/
│   │   │   ├── ImageGenerationProvider.ts
│   │   │   ├── BedrockProvider.ts
│   │   │   └── MockProvider.ts
│   │   ├── storage/
│   │   │   ├── S3Service.ts
│   │   │   └── DynamoDBService.ts
│   │   ├── auth/
│   │   │   └── CognitoService.ts
│   │   └── queue/
│   │       └── SQSService.ts
│   ├── models/
│   │   ├── Project.ts
│   │   ├── GenerationJob.ts
│   │   └── User.ts
│   ├── utils/
│   │   ├── logger.ts
│   │   ├── validation.ts
│   │   ├── errors.ts
│   │   └── prompts.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── errorHandler.ts
│   │   └── rateLimit.ts
│   └── types/
│       ├── api.ts
│       ├── generation.ts
│       └── dynamodb.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── package.json
├── tsconfig.json
└── .env.example
```

## Data Models

### DynamoDB Single-Table Design

**Table Name:** `Hoomefy`  
**Partition Key:** `PK` (String)  
**Sort Key:** `SK` (String)

**GSI1:**
- Partition Key: `GSI1PK` (String)
- Sort Key: `GSI1SK` (String)

**Entity Types:**

#### User Profile
```typescript
{
  PK: "USER#<userId>",
  SK: "PROFILE",
  GSI1PK: "USER#<email>",
  GSI1SK: "PROFILE",
  userId: string,
  email: string,
  name: string,
  createdAt: string,
  hauntedModeEnabled: boolean,
  quotaUsed: number,
  quotaLimit: number,
  quotaResetDate: string
}
```

#### Project
```typescript
{
  PK: "USER#<userId>",
  SK: "PROJECT#<projectId>",
  GSI1PK: "PROJECT#<projectId>",
  GSI1SK: "USER#<userId>",
  projectId: string,
  userId: string,
  name: string,
  roomType: string,
  style: string,
  originalImageKey: string,
  generatedImageKey: string,
  generationJobId: string,
  preferences: {
    colorPalette: string,
    intensity: number,
    customInstructions: string
  },
  createdAt: string,
  updatedAt: string
}
```

#### Generation Job
```typescript
{
  PK: "JOB#<jobId>",
  SK: "STATUS",
  GSI1PK: "USER#<userId>",
  GSI1SK: "JOB#<createdAt>#<jobId>",
  jobId: string,
  userId: string,
  projectId: string,
  status: "pending" | "processing" | "completed" | "failed",
  originalImageKey: string,
  generatedImageKey: string | null,
  roomType: string,
  style: string,
  preferences: object,
  errorMessage: string | null,
  retryCount: number,
  createdAt: string,
  startedAt: string | null,
  completedAt: string | null,
  processingTimeMs: number | null
}
```

**Access Patterns:**
1. Get user profile by userId: `PK = USER#<userId>, SK = PROFILE`
2. Get user profile by email: `GSI1PK = USER#<email>, GSI1SK = PROFILE`
3. List user projects: `PK = USER#<userId>, SK begins_with PROJECT#`
4. Get project by projectId: `GSI1PK = PROJECT#<projectId>`
5. Get job by jobId: `PK = JOB#<jobId>, SK = STATUS`
6. List user jobs: `GSI1PK = USER#<userId>, SK begins_with JOB#`

### S3 Storage Structure

**Bucket Name:** `hoomefy-images-<env>-<accountId>`

**Folder Structure:**
```
/uploads/
  /<userId>/
    /<projectId>/
      /original.jpg
      /generated.jpg

/samples/  # Demo images for gallery
  /living-room-modern.jpg
  /bedroom-scandinavian.jpg
  ...
```

**Object Metadata:**
- `x-amz-meta-user-id`: User identifier
- `x-amz-meta-project-id`: Project identifier
- `x-amz-meta-image-type`: "original" | "generated"
- `x-amz-meta-uploaded-at`: ISO timestamp

## API Design

### Authentication

All API endpoints except public routes require JWT authentication via Cognito.

**Authorization Header:**
```
Authorization: Bearer <jwt-token>
```

### Endpoints

#### POST /api/uploads
**Description:** Request presigned URL for image upload

**Request:**
```typescript
{
  projectId?: string,  // Optional, for re-upload
  contentType: string, // "image/jpeg", "image/png", "image/webp"
  fileSize: number     // Bytes
}
```

**Response:**
```typescript
{
  uploadUrl: string,
  imageKey: string,
  expiresIn: number  // Seconds
}
```

**Validation:**
- File size: 100KB - 10MB
- Content type: image/jpeg, image/png, image/webp
- User authenticated
- Under quota limit

#### POST /api/generations
**Description:** Create AI transformation job

**Request:**
```typescript
{
  projectId?: string,      // Optional, creates new if omitted
  projectName?: string,
  imageKey: string,
  roomType: "living-room" | "bedroom" | "kitchen" | "dining-room" | "office" | "bathroom" | "other",
  style: "modern-minimalist" | "scandinavian" | "japandi" | "contemporary-luxury" | "industrial" | "bohemian" | "mid-century-modern" | "coastal" | "modern-classic" | "haunted-chic",
  preferences: {
    colorPalette?: "warm" | "cool" | "neutral" | "bold",
    intensity?: number,  // 0.0 - 1.0
    customInstructions?: string  // Max 500 chars
  }
}
```

**Response:**
```typescript
{
  jobId: string,
  projectId: string,
  status: "pending",
  estimatedTimeSeconds: number
}
```

**Validation:**
- Image exists and belongs to user
- Valid room type and style
- User under quota
- Valid preferences

#### GET /api/generations/{jobId}
**Description:** Get generation job status

**Response:**
```typescript
{
  jobId: string,
  projectId: string,
  status: "pending" | "processing" | "completed" | "failed",
  progress?: number,  // 0-100 (optional)
  generatedImageUrl?: string,  // Presigned URL when completed
  errorMessage?: string,
  createdAt: string,
  completedAt?: string
}
```

#### GET /api/projects
**Description:** List user's projects

**Query Parameters:**
- `limit` (default: 50, max: 100)
- `cursor` (pagination token)
- `sortBy` (date|name)
- `order` (asc|desc)

**Response:**
```typescript
{
  projects: Array<{
    projectId: string,
    name: string,
    roomType: string,
    style: string,
    originalImageUrl: string,  // Presigned
    generatedImageUrl: string,  // Presigned
    createdAt: string,
    updatedAt: string
  }>,
  cursor?: string  // Next page token
}
```

#### GET /api/projects/{projectId}
**Description:** Get project details

**Response:**
```typescript
{
  projectId: string,
  name: string,
  roomType: string,
  style: string,
  preferences: object,
  originalImageUrl: string,
  generatedImageUrl: string,
  createdAt: string,
  updatedAt: string
}
```

#### PATCH /api/projects/{projectId}
**Description:** Update project

**Request:**
```typescript
{
  name?: string
}
```

**Response:**
```typescript
{
  projectId: string,
  name: string,
  updatedAt: string
}
```

#### DELETE /api/projects/{projectId}
**Description:** Delete project and associated images

**Response:**
```typescript
{
  success: true,
  deletedAt: string
}
```

#### GET /api/account
**Description:** Get user account information

**Response:**
```typescript
{
  userId: string,
  email: string,
  name: string,
  hauntedModeEnabled: boolean,
  createdAt: string
}
```

#### GET /api/usage
**Description:** Get usage and quota information

**Response:**
```typescript
{
  quotaUsed: number,
  quotaLimit: number,
  quotaResetDate: string,
  projectCount: number,
  storageUsedMB: number
}
```

### Error Responses

**Standard Error Format:**
```typescript
{
  error: {
    code: string,
    message: string,
    details?: object
  }
}
```

**Status Codes:**
- 400: Bad Request (validation failed)
- 401: Unauthorized (invalid/missing token)
- 403: Forbidden (insufficient permissions)
- 404: Not Found
- 429: Too Many Requests (rate limit)
- 500: Internal Server Error

## Image Generation System

### Provider Interface

```typescript
interface ImageGenerationProvider {
  /**
   * Generate transformed room image
   */
  generateTransformation(params: {
    originalImageUrl: string,
    roomType: RoomType,
    style: DesignStyle,
    preferences: DesignPreferences
  }): Promise<GeneratedImage>;

  /**
   * Get generation status (for async providers)
   */
  getStatus(jobId: string): Promise<JobStatus>;

  /**
   * Cancel ongoing generation
   */
  cancel(jobId: string): Promise<void>;
}

interface GeneratedImage {
  imageData: Buffer,
  format: 'jpeg' | 'png' | 'webp',
  width: number,
  height: number,
  metadata?: object
}

interface JobStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed',
  progress?: number,
  errorMessage?: string
}
```

### Bedrock Provider Implementation

**Model:** Stability AI Stable Image Control Structure  
**Inference Profile:** `us.stability.stable-image-control-structure-v1-0`

**Request Flow:**
1. Download original image from S3
2. Resize/optimize if needed (max 2048px)
3. Construct structured prompt
4. Invoke Bedrock InvokeModel API
5. Process response image
6. Upload to S3
7. Update job status

**Prompt Template:**
```
[Style Directive]
Transform this {roomType} into {styleDescription}.

[Preservation Constraints]
PRESERVE: room dimensions, wall positions, window locations, door placement, ceiling height, floor layout, camera perspective.

[Transformation Targets]
CHANGE: furniture style and arrangement, wall colors and finishes, decorative elements, lighting fixtures, textiles, accessories.

[Style Details]
{styleSpecificGuidance}

[User Preferences]
Color palette: {colorPalette}
Intensity: {intensity}
{customInstructions}

[Technical Requirements]
Maintain photorealistic quality. Ensure consistent lighting. Preserve architectural integrity.
```

**Style-Specific Guidance:**

- **Modern Minimalist:** Clean lines, neutral colors, minimal furniture, hidden storage, natural materials
- **Scandinavian:** Light wood tones, white walls, cozy textiles, functional design, hygge atmosphere
- **Japandi:** Japanese minimalism meets Scandinavian warmth, natural materials, low furniture, zen aesthetics
- **Contemporary Luxury:** Bold statement pieces, rich textures, metallic accents, premium finishes
- **Industrial:** Exposed brick, metal fixtures, concrete elements, vintage industrial furniture
- **Bohemian:** Layered textiles, global patterns, plants, eclectic mix, warm earthy tones
- **Mid-Century Modern:** Organic curves, walnut wood, retro furniture, geometric patterns
- **Coastal:** Light airy feel, blue and white palette, natural textures, beach-inspired decor
- **Modern Classic:** Timeless elegance, balanced proportions, quality craftsmanship, refined details
- **Haunted Chic:** Victorian elegance with dark romance, deep jewel tones, ornate details, mysterious ambiance (candelabras, velvet, antique mirrors)

### Mock Provider Implementation

**Behavior:**
- Returns predefined sample transformations
- Simulates realistic latency (5-10 seconds)
- Cycles through sample images based on style selection
- Logs clearly as mock generation
- No AWS credentials required

**Sample Image Mapping:**
```typescript
const MOCK_SAMPLES = {
  'modern-minimalist': '/samples/modern-minimalist-living.jpg',
  'scandinavian': '/samples/scandinavian-bedroom.jpg',
  // ... etc
};
```

## Authentication Flow

### Sign Up Flow

```
1. User submits email + password
2. Frontend validates inputs
3. Frontend calls Cognito SignUp API
4. Cognito sends verification email
5. User clicks email link
6. Frontend confirms email with code
7. Cognito PostConfirmation trigger fires
8. Lambda creates user profile in DynamoDB
9. User redirected to sign in
```

### Sign In Flow

```
1. User submits email + password
2. Frontend calls Cognito InitiateAuth
3. Cognito validates credentials
4. Cognito returns JWT tokens (id, access, refresh)
5. Frontend stores tokens securely
6. Frontend includes ID token in API requests
7. API Gateway validates JWT signature
8. Lambda extracts userId from token claims
```

### Token Refresh Flow

```
1. Frontend detects expired access token
2. Frontend calls Cognito with refresh token
3. Cognito issues new access/id tokens
4. Frontend updates stored tokens
5. Frontend retries failed API request
```

## Generation Workflow

### Asynchronous Job Processing

```
┌─────────────┐
│   Frontend  │
└──────┬──────┘
       │ POST /api/generations
       ▼
┌─────────────────┐
│  API Lambda     │
│  - Validate     │
│  - Create job   │──────► DynamoDB (status: pending)
│  - Send to SQS  │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│   SQS Queue     │
│  (Job message)  │
└──────┬──────────┘
       │ Poll
       ▼
┌─────────────────────────┐
│  Generation Worker      │
│  - Update status        │──────► DynamoDB (status: processing)
│  - Download image       │
│  - Call AI provider     │
│  - Upload result        │──────► S3
│  - Update status        │──────► DynamoDB (status: completed)
└─────────────────────────┘
       │
       │
       ▼
┌─────────────┐
│   Frontend  │ ◄──── Poll GET /api/generations/{jobId}
│  (displays) │
└─────────────┘
```

**Job States:**
- `pending`: Job created, waiting in queue
- `processing`: Worker picked up job, generating image
- `completed`: Image generated successfully
- `failed`: Generation failed (error logged)

**Retry Logic:**
- SQS visibility timeout: 300 seconds
- Max receive count: 3
- Dead-letter queue for permanent failures
- Exponential backoff for transient errors

**Idempotency:**
- Job ID is deterministic for same input
- Check existing job before creating new one
- Prevent duplicate SQS messages

## Security Architecture

### IAM Permissions

**Lambda Execution Roles:**

API Handler Role:
- dynamodb:GetItem, PutItem, Query, UpdateItem, DeleteItem
- s3:PutObject, GetObject (via presigned URLs)
- cognito:GetUser
- logs:CreateLogGroup, CreateLogStream, PutLogEvents

Generation Worker Role:
- dynamodb:GetItem, UpdateItem
- s3:GetObject, PutObject
- sqs:ReceiveMessage, DeleteMessage, ChangeMessageVisibility
- bedrock:InvokeModel
- logs:*

**Cognito User Pool:**
- Email/password authentication
- Password policy: min 8 chars, uppercase, lowercase, number
- MFA optional (email-based)
- Account lockout after 5 failed attempts

### Data Protection

**S3 Bucket Security:**
- Block all public access
- Server-side encryption (SSE-S3)
- Versioning disabled (cost optimization)
- Lifecycle policy: delete objects after 90 days
- CORS restricted to frontend domain

**DynamoDB Security:**
- Point-in-time recovery enabled
- Encryption at rest (AWS managed keys)
- Fine-grained access control via IAM
- Audit logging to CloudWatch

**API Security:**
- HTTPS only
- JWT validation on all protected routes
- Request validation schemas
- Rate limiting: 100 req/min per user
- CORS restricted to frontend origin
- Security headers (CSP, HSTS, X-Frame-Options)

**Input Validation:**
- File type verification (magic bytes, not just extension)
- File size limits (10MB max)
- Image dimension validation
- SQL injection prevention (N/A for DynamoDB)
- XSS prevention (React escapes by default)
- CSRF tokens for state-changing operations

## Monitoring & Observability

### CloudWatch Logs

**Log Groups:**
- `/aws/lambda/hoomefy-api-handler`
- `/aws/lambda/hoomefy-generation-worker`
- `/aws/apigateway/hoomefy-api`

**Structured Logging:**
```typescript
{
  timestamp: "2026-11-05T10:30:00Z",
  level: "INFO",
  userId: "user-123",
  requestId: "abc-def-123",
  action: "create_generation",
  duration: 245,
  metadata: { ... }
}
```

### Metrics

**Custom Metrics:**
- `GenerationRequested`: Count of generation jobs created
- `GenerationCompleted`: Count of successful generations
- `GenerationFailed`: Count of failed generations
- `GenerationDuration`: Time to complete generation (ms)
- `QuotaExceeded`: Count of quota rejections
- `ApiLatency`: API response times (p50, p99)

### Alarms

**Critical Alarms:**
- Lambda errors > 10 in 5 minutes
- API Gateway 5xx errors > 5% 
- Generation failure rate > 20%
- DynamoDB throttling detected
- S3 bucket approaching quota
- Daily AWS spend > $10

**Cost Monitoring:**
- AWS Budget: Alert at $5, $10, $15
- Bedrock usage tracking
- S3 storage size monitoring
- Lambda invocation count

## Frontend Architecture Details

### State Management

**Auth State (Zustand):**
```typescript
interface AuthState {
  user: User | null;
  tokens: Tokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  refreshTokens: () => Promise<void>;
}
```

**Studio State (Zustand):**
```typescript
interface StudioState {
  uploadedImage: UploadedImage | null;
  roomType: RoomType;
  selectedStyle: DesignStyle;
  preferences: DesignPreferences;
  currentJobId: string | null;
  generatedImage: GeneratedImage | null;
  setImage: (image: UploadedImage) => void;
  setRoomType: (type: RoomType) => void;
  setStyle: (style: DesignStyle) => void;
  setPreferences: (prefs: DesignPreferences) => void;
  reset: () => void;
}
```

**UI State (Context):**
```typescript
interface UIState {
  hauntedModeEnabled: boolean;
  toggleHauntedMode: () => void;
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
}
```

### Component Architecture

**Design System Hierarchy:**

1. **Primitives** (shadcn/ui)
   - Button, Input, Select, Dialog, Toast, etc.

2. **Composite Components**
   - PhotoUpload, StyleSelector, ComparisonSlider

3. **Feature Components**
   - DesignStudio, ProjectGallery, GenerationProgress

4. **Page Components**
   - HomePage, DesignStudioPage, GalleryPage

5. **Layout Components**
   - Header, Footer, Navigation, PageLayout

**Haunted Effect Layers:**

1. **Base Layer:** Normal UI components
2. **Atmosphere Layer:** Fog, particles, shadows (CSS/Canvas)
3. **Interactive Layer:** Button glows, hover effects (Framer Motion)
4. **Character Layer:** Mori ghost (animated SVG/Lottie)
5. **Ritual Layer:** Transformation animations (Framer Motion)

### Routing

```typescript
const routes = [
  { path: '/', element: <HomePage /> },
  { path: '/studio', element: <ProtectedRoute><DesignStudioPage /></ProtectedRoute> },
  { path: '/gallery', element: <ProtectedRoute><GalleryPage /></ProtectedRoute> },
  { path: '/projects/:id', element: <ProtectedRoute><ProjectDetailPage /></ProtectedRoute> },
  { path: '/how-it-works', element: <HowItWorksPage /> },
  { path: '/about', element: <AboutPage /> },
  { path: '/signin', element: <SignInPage /> },
  { path: '/signup', element: <SignUpPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '*', element: <NotFoundPage /> }
];
```

## Design System

### Color Palette

**Base Colors:**
```css
--midnight-navy: #0A1128;
--deep-purple: #1C0B33;
--warm-amber: #D4A574;
--ivory: #F5F1E8;
--gold-accent: #C9A961;
```

**Semantic Colors:**
```css
--primary: var(--warm-amber);
--secondary: var(--deep-purple);
--background: var(--midnight-navy);
--foreground: var(--ivory);
--accent: var(--gold-accent);
--success: #4CAF50;
--error: #EF4444;
--warning: #FFA726;
```

**Haunted Overlays:**
```css
--ghost-white: rgba(255, 255, 255, 0.9);
--mist-overlay: rgba(200, 200, 255, 0.1);
--shadow-dark: rgba(0, 0, 0, 0.6);
--glow-amber: rgba(212, 165, 116, 0.4);
```

### Typography

**Font Families:**
- Headings: "Playfair Display" (serif, elegant)
- Body: "Inter" (sans-serif, modern)
- Mono: "JetBrains Mono" (code, technical)

**Type Scale:**
```css
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
--text-4xl: 2.25rem;   /* 36px */
--text-5xl: 3rem;      /* 48px */
```

### Spacing System

```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-24: 6rem;     /* 96px */
```

### Animation Guidelines

**Timing Functions:**
```css
--ease-smooth: cubic-bezier(0.4, 0.0, 0.2, 1);
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
--ease-ghost: cubic-bezier(0.25, 0.46, 0.45, 0.94);
```

**Durations:**
- Micro-interactions: 150ms
- UI transitions: 300ms
- Page transitions: 500ms
- Haunted effects: 2000-5000ms (slow, ethereal)

**Performance:**
- Use `transform` and `opacity` for animations
- Avoid animating `width`, `height`, `top`, `left`
- Use `will-change` sparingly
- Respect `prefers-reduced-motion`

## Deployment Architecture

### Environments

**Development:**
- Local dev server (Vite)
- Mock AI provider
- LocalStack for AWS services (optional)
- Hot module replacement

**Staging:**
- AWS deployment in `us-west-2`
- Mock AI provider
- Separate Cognito user pool
- Real AWS services for testing

**Production:**
- AWS deployment in `us-west-2`
- Real Bedrock integration
- Separate Cognito user pool
- CloudFront CDN (optional)
- Custom domain (optional)

### Infrastructure as Code

**AWS CDK Structure:**
```typescript
// Main stack
class HoomefyStack extends cdk.Stack {
  constructor(scope, id, props) {
    // Auth resources
    const authStack = new AuthStack(this, 'Auth');
    
    // Storage resources
    const storageStack = new StorageStack(this, 'Storage');
    
    // API resources
    const apiStack = new ApiStack(this, 'API', {
      userPool: authStack.userPool,
      imagesBucket: storageStack.imagesBucket,
      table: storageStack.table
    });
    
    // Compute resources
    const computeStack = new ComputeStack(this, 'Compute', {
      queue: storageStack.jobQueue,
      table: storageStack.table,
      bucket: storageStack.imagesBucket
    });
  }
}
```

### Deployment Process

```bash
# Build frontend
cd frontend
npm run build

# Deploy infrastructure
cd backend/infrastructure
npx cdk deploy --all

# Upload frontend to S3 (or Amplify)
aws s3 sync ../../frontend/dist s3://hoomefy-frontend-<env>

# Invalidate CloudFront cache (if using CDN)
aws cloudfront create-invalidation --distribution-id <id> --paths "/*"
```

## Testing Strategy

### Unit Tests
- Services (DynamoDB, S3, SQS)
- Utilities (validation, formatting)
- Prompt generation
- React hooks

### Integration Tests
- API endpoints (with mocked services)
- Image upload flow
- Generation job flow
- Authentication flow

### End-to-End Tests
- Full user journeys
- Photo upload → style selection → generation → comparison
- Sign up → create project → save to gallery
- Toggle haunted mode

### Performance Tests
- Load testing API endpoints
- Image processing benchmarks
- Frontend bundle size
- Lighthouse audits

## Cost Estimation

**Monthly Costs (1000 users, 100 generations/day):**

| Service | Usage | Cost |
|---------|-------|------|
| Lambda | 500K invocations, 100K GB-seconds | $1.50 |
| DynamoDB | 1M reads, 100K writes, 1GB storage | $1.00 |
| S3 | 100GB storage, 1M requests | $2.50 |
| Cognito | 1000 MAUs | Free tier |
| API Gateway | 1M requests | $3.50 |
| SQS | 100K messages | $0.05 |
| Bedrock (Mock) | 0 invocations | $0.00 |
| Bedrock (Real) | 3000 invocations @ $0.05 | $150.00 |
| CloudWatch | Logs + metrics | $5.00 |
| **Total (Mock)** | | **~$13.55/month** |
| **Total (Real)** | | **~$163.55/month** |

**Cost Optimization:**
- Use mock provider by default
- Implement strict quotas
- S3 lifecycle policies
- Lambda reserved concurrency limits
- DynamoDB on-demand billing

## Success Criteria

**Technical:**
- [ ] All API endpoints functional
- [ ] Image upload works reliably
- [ ] Generation completes in <60s
- [ ] Before/after comparison smooth
- [ ] Gallery loads quickly
- [ ] Authentication secure
- [ ] Mobile responsive
- [ ] Accessible (WCAG AA)

**User Experience:**
- [ ] Landing page impressive
- [ ] Upload process intuitive
- [ ] Design studio clear and organized
- [ ] Haunted effects delightful
- [ ] Normal mode fully functional
- [ ] Error messages helpful
- [ ] Loading states informative

**Business:**
- [ ] Demo video compelling
- [ ] Documentation comprehensive
- [ ] Code ready for open source
- [ ] Deployable in 30 minutes
- [ ] Cost under $20/month (mock mode)
- [ ] Judge account setup simple

---

**Next Steps:** Proceed to tasks.md for implementation breakdown
