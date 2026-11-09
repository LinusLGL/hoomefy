# Hoomefy Security Standards

**Purpose:** Security guidelines, threat models, and best practices for Hoomefy.

## Security Principles

1. **Defense in Depth:** Multiple layers of security controls
2. **Least Privilege:** Grant minimum necessary permissions
3. **Zero Trust:** Verify every request, trust nothing by default
4. **Fail Securely:** Errors should not expose sensitive information
5. **Security by Design:** Build security in, not bolt it on

## Threat Model

### Assets to Protect
- User credentials and authentication tokens
- User-uploaded room photographs (potentially private spaces)
- AI-generated designs
- User project data and preferences
- AWS infrastructure and costs
- Application availability

### Potential Threats
1. **Unauthorized Access:** Attackers accessing other users' data
2. **Data Breach:** Exposure of stored images or user information
3. **Account Takeover:** Credential theft or session hijacking
4. **Injection Attacks:** SQL/NoSQL injection, XSS, command injection
5. **Resource Exhaustion:** DDoS, quota abuse, cost escalation
6. **Privilege Escalation:** Gaining admin or elevated permissions
7. **Supply Chain:** Compromised dependencies
8. **Data Loss:** Accidental or malicious deletion

## Authentication & Authorization

### Cognito Configuration

**User Pool Settings:**
```typescript
new cognito.UserPool(this, 'UserPool', {
  userPoolName: 'hoomefy-users',
  selfSignUpEnabled: true,
  signInAliases: {
    email: true,
  },
  autoVerify: {
    email: true,
  },
  passwordPolicy: {
    minLength: 8,
    requireLowercase: true,
    requireUppercase: true,
    requireDigits: true,
    requireSymbols: false, // Optional for user convenience
    tempPasswordValidity: Duration.days(3),
  },
  accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
  mfa: cognito.Mfa.OPTIONAL,
  mfaSecondFactor: {
    sms: true,
    otp: false, // Can enable TOTP in future
  },
  advancedSecurityMode: cognito.AdvancedSecurityMode.ENFORCED,
});
```

**Account Lockout:**
- Enable adaptive authentication in Cognito
- Automatically lock accounts after 5 failed login attempts
- Send notification email on suspicious activity

### JWT Validation

**Backend Validation:**
```typescript
import { CognitoJwtVerifier } from 'aws-jwt-verify';

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.USER_POOL_ID!,
  tokenUse: 'id',
  clientId: process.env.USER_POOL_CLIENT_ID!,
});

export async function authenticate(
  event: APIGatewayProxyEvent
): Promise<string> {
  const token = event.headers.Authorization?.replace('Bearer ', '');
  
  if (!token) {
    throw new AppError(401, 'UNAUTHORIZED', 'Missing authentication token');
  }
  
  try {
    const payload = await verifier.verify(token);
    return payload.sub; // User ID
  } catch (error) {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired token');
  }
}
```

**Frontend Token Management:**
```typescript
// Store tokens securely
localStorage.setItem('hoomefy_tokens', JSON.stringify({
  idToken: tokens.IdToken,
  accessToken: tokens.AccessToken,
  refreshToken: tokens.RefreshToken,
  expiresAt: Date.now() + (tokens.ExpiresIn * 1000),
}));

// Clear on logout
localStorage.removeItem('hoomefy_tokens');

// Never log tokens
console.log('Token:', token); // ❌ NEVER DO THIS
```

### Authorization Checks

**Resource Ownership:**
```typescript
// Always verify user owns the resource
async function getProject(projectId: string, userId: string): Promise<Project> {
  const project = await dynamodb.getItem({
    PK: `USER#${userId}`,
    SK: `PROJECT#${projectId}`,
  });
  
  if (!project) {
    throw new AppError(404, 'NOT_FOUND', 'Project not found');
  }
  
  if (project.userId !== userId) {
    throw new AppError(403, 'FORBIDDEN', 'Access denied');
  }
  
  return project;
}
```

## Data Protection

### Encryption at Rest

**S3 Bucket:**
```typescript
new s3.Bucket(this, 'ImagesBucket', {
  encryption: s3.BucketEncryption.S3_MANAGED,
  // Or use KMS for more control:
  // encryption: s3.BucketEncryption.KMS,
  // encryptionKey: kmsKey,
});
```

**DynamoDB:**
```typescript
new dynamodb.Table(this, 'Table', {
  encryption: dynamodb.TableEncryption.AWS_MANAGED,
  // Or use customer-managed KMS key:
  // encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
  // encryptionKey: kmsKey,
});
```

### Encryption in Transit

- **HTTPS Only:** Enforce TLS 1.2+ for all connections
- **API Gateway:** Configured for HTTPS by default
- **S3 Presigned URLs:** Use HTTPS protocol

```typescript
const url = await s3.getSignedUrl('getObject', {
  Bucket: bucketName,
  Key: imageKey,
  Expires: 900, // 15 minutes
  // Force HTTPS
  Protocol: 'https',
});
```

### Data Retention

**S3 Lifecycle Policy:**
```typescript
bucket.addLifecycleRule({
  id: 'DeleteOldImages',
  enabled: true,
  expiration: Duration.days(90),
  abortIncompleteMultipartUploadAfter: Duration.days(1),
});
```

**User Data Deletion:**
```typescript
async function deleteUser(userId: string): Promise<void> {
  // Delete all user projects from DynamoDB
  await deleteAllProjects(userId);
  
  // Delete all user images from S3
  await deleteUserImages(userId);
  
  // Delete Cognito user
  await cognito.adminDeleteUser({
    UserPoolId: userPoolId,
    Username: userId,
  });
}
```

### Sensitive Data Handling

**Never Log Sensitive Data:**
```typescript
// ❌ BAD
console.log('User data:', user); // May contain email, name, etc.
console.log('Token:', token);

// ✅ GOOD
console.log('User authenticated:', user.id);
console.log('Token received:', !!token);
```

**Strip EXIF Data:**
```typescript
import sharp from 'sharp';

async function stripMetadata(imageBuffer: Buffer): Promise<Buffer> {
  return await sharp(imageBuffer)
    .rotate() // Auto-rotate based on EXIF
    .withMetadata({ orientation: undefined }) // Remove orientation
    .toBuffer();
}
```

## Input Validation

### File Upload Validation

**Frontend Validation:**
```typescript
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MIN_DIMENSION = 512;
const MAX_DIMENSION = 4096;

async function validateImage(file: File): Promise<void> {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Image must be smaller than 10MB');
  }
  
  // Check MIME type
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Please upload a JPEG, PNG, or WebP image');
  }
  
  // Verify actual image format (magic bytes)
  const arrayBuffer = await file.slice(0, 12).arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  
  const isValidImage = 
    isJPEG(uint8Array) || 
    isPNG(uint8Array) || 
    isWebP(uint8Array);
  
  if (!isValidImage) {
    throw new Error('Invalid image file');
  }
  
  // Check dimensions
  const image = await createImageBitmap(file);
  if (image.width < MIN_DIMENSION || image.height < MIN_DIMENSION) {
    throw new Error('Image must be at least 512x512 pixels');
  }
  if (image.width > MAX_DIMENSION || image.height > MAX_DIMENSION) {
    throw new Error('Image dimensions too large');
  }
}
```

**Backend Validation:**
```typescript
async function validateUploadedImage(
  bucket: string,
  key: string
): Promise<void> {
  // Download image header
  const { Body, ContentType, ContentLength } = await s3.getObject({
    Bucket: bucket,
    Key: key,
    Range: 'bytes=0-11', // First 12 bytes
  });
  
  // Verify content type
  if (!ALLOWED_TYPES.includes(ContentType)) {
    await s3.deleteObject({ Bucket: bucket, Key: key });
    throw new AppError(400, 'INVALID_FILE_TYPE', 'Invalid image format');
  }
  
  // Verify file size
  if (ContentLength > MAX_FILE_SIZE) {
    await s3.deleteObject({ Bucket: bucket, Key: key });
    throw new AppError(400, 'FILE_TOO_LARGE', 'Image too large');
  }
  
  // Verify magic bytes match content type
  const buffer = await streamToBuffer(Body);
  const uint8Array = new Uint8Array(buffer);
  
  if (ContentType === 'image/jpeg' && !isJPEG(uint8Array)) {
    await s3.deleteObject({ Bucket: bucket, Key: key });
    throw new AppError(400, 'INVALID_FILE', 'File is not a valid JPEG');
  }
  // Similar checks for PNG, WebP
}
```

### API Input Validation

**Use Zod Schemas:**
```typescript
import { z } from 'zod';

const CreateGenerationSchema = z.object({
  imageKey: z.string().min(1).max(500),
  roomType: z.enum([
    'living-room',
    'bedroom',
    'kitchen',
    'dining-room',
    'office',
    'bathroom',
    'other',
  ]),
  style: z.enum([
    'modern-minimalist',
    'scandinavian',
    'japandi',
    'contemporary-luxury',
    'industrial',
    'bohemian',
    'mid-century-modern',
    'coastal',
    'modern-classic',
    'haunted-chic',
  ]),
  preferences: z.object({
    colorPalette: z.enum(['warm', 'cool', 'neutral', 'bold']).optional(),
    intensity: z.number().min(0).max(1).optional(),
    customInstructions: z.string().max(500).optional(),
  }).optional(),
});

export async function createGeneration(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const userId = authenticate(event);
  
  // Parse and validate input
  const body = JSON.parse(event.body || '{}');
  const validation = CreateGenerationSchema.safeParse(body);
  
  if (!validation.success) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Invalid request',
      validation.error.errors
    );
  }
  
  const input = validation.data;
  // Process request...
}
```

### SQL/NoSQL Injection Prevention

**DynamoDB:** Use AWS SDK with parameter binding (safe by default)
```typescript
// ✅ SAFE - Parameters are properly escaped
await dynamodb.putItem({
  TableName: tableName,
  Item: marshall({
    PK: `USER#${userId}`,
    SK: `PROJECT#${projectId}`,
    name: userProvidedName, // Automatically escaped
  }),
});

// ❌ NEVER construct query strings manually
```

## Cross-Site Scripting (XSS) Prevention

### React Auto-Escaping

React automatically escapes content in JSX:
```typescript
// ✅ SAFE - React escapes automatically
<div>{user.name}</div>
<div>{project.description}</div>

// ⚠️ DANGEROUS - Only use with trusted content
<div dangerouslySetInnerHTML={{ __html: htmlString }} />
```

### Content Security Policy

**API Gateway Response Headers:**
```typescript
const headers = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'", // Vite requires unsafe-inline in dev
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.amazonaws.com",
    "frame-ancestors 'none'",
  ].join('; '),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};
```

## Rate Limiting & Quota Management

### API Gateway Throttling

```typescript
const api = new apigateway.RestApi(this, 'Api', {
  deployOptions: {
    throttlingBurstLimit: 100, // Concurrent requests
    throttlingRateLimit: 50,   // Requests per second
  },
});

// Per-method throttling for expensive operations
const generateMethod = api.root
  .resourceForPath('/api/generations')
  .addMethod('POST', integration, {
    throttling: {
      burstLimit: 10,
      rateLimit: 5,
    },
  });
```

### User Quota Enforcement

```typescript
async function checkQuota(userId: string): Promise<void> {
  const user = await dynamodb.getItem({
    PK: `USER#${userId}`,
    SK: 'PROFILE',
  });
  
  const today = new Date().toISOString().split('T')[0];
  
  if (user.quotaResetDate !== today) {
    // Reset daily quota
    await dynamodb.updateItem({
      PK: `USER#${userId}`,
      SK: 'PROFILE',
      quotaUsed: 0,
      quotaResetDate: today,
    });
    user.quotaUsed = 0;
  }
  
  if (user.quotaUsed >= user.quotaLimit) {
    throw new AppError(
      429,
      'QUOTA_EXCEEDED',
      'Daily generation limit reached. Please try again tomorrow.'
    );
  }
}

async function incrementQuota(userId: string): Promise<void> {
  await dynamodb.updateItem({
    PK: `USER#${userId}`,
    SK: 'PROFILE',
    quotaUsed: { $add: 1 },
  });
}
```

### Cost Protection

```typescript
// Global generation counter
const GLOBAL_DAILY_LIMIT = 1000;

async function checkGlobalQuota(): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const counterKey = `COUNTER#GENERATIONS#${today}`;
  
  const counter = await dynamodb.getItem({
    PK: 'GLOBAL',
    SK: counterKey,
  });
  
  if (counter && counter.count >= GLOBAL_DAILY_LIMIT) {
    throw new AppError(
      503,
      'SERVICE_UNAVAILABLE',
      'Generation service temporarily unavailable. Please try again later.'
    );
  }
}
```

## CORS Configuration

**API Gateway:**
```typescript
const api = new apigateway.RestApi(this, 'Api', {
  defaultCorsPreflightOptions: {
    allowOrigins: [
      'https://hoomefy.example.com',
      'http://localhost:5173', // Vite dev server
    ],
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
    ],
    allowCredentials: true,
    maxAge: Duration.hours(1),
  },
});
```

**S3 Bucket:**
```typescript
bucket.addCorsRule({
  allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
  allowedOrigins: ['https://hoomefy.example.com', 'http://localhost:5173'],
  allowedHeaders: ['*'],
  maxAge: 3600,
});
```

## Dependency Security

### Regular Updates

```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Update dependencies
npm update
```

### Lock Files

- Commit `package-lock.json` and `yarn.lock`
- Review dependency changes in PRs
- Use `npm ci` in CI/CD (not `npm install`)

### Supply Chain Protection

```json
// package.json
{
  "scripts": {
    "preinstall": "npm audit --audit-level=high"
  }
}
```

## Logging & Monitoring

### Structured Logging

```typescript
interface LogEntry {
  timestamp: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  userId?: string;
  requestId?: string;
  action: string;
  duration?: number;
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, any>;
}

export function log(entry: Omit<LogEntry, 'timestamp'>): void {
  const logEntry: LogEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  };
  
  // Never log sensitive data
  if (entry.metadata) {
    delete entry.metadata.password;
    delete entry.metadata.token;
    delete entry.metadata.creditCard;
  }
  
  console.log(JSON.stringify(logEntry));
}
```

### CloudWatch Alarms

```typescript
// Lambda errors
new cloudwatch.Alarm(this, 'LambdaErrors', {
  metric: lambda.metricErrors(),
  threshold: 10,
  evaluationPeriods: 1,
  alarmDescription: 'Lambda function errors exceeded threshold',
});

// API Gateway 5xx errors
new cloudwatch.Alarm(this, 'Api5xxErrors', {
  metric: api.metricServerError(),
  threshold: 5,
  evaluationPeriods: 1,
  treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
});

// High generation costs
new cloudwatch.Alarm(this, 'HighGenerationCount', {
  metric: new cloudwatch.Metric({
    namespace: 'Hoomefy',
    metricName: 'GenerationCount',
    statistic: 'Sum',
    period: Duration.hours(1),
  }),
  threshold: 100,
  evaluationPeriods: 1,
});
```

## Incident Response

### Security Incident Playbook

1. **Detect:** CloudWatch alarms, AWS GuardDuty, user reports
2. **Contain:** Revoke compromised credentials, disable affected features
3. **Investigate:** Review CloudWatch logs, access patterns, data access
4. **Eradicate:** Remove malicious code, patch vulnerabilities
5. **Recover:** Restore from backups, re-enable features
6. **Learn:** Post-mortem, update security controls

### Emergency Procedures

**Revoke All User Sessions:**
```bash
aws cognito-idp admin-user-global-sign-out \
  --user-pool-id us-west-2_xxx \
  --username user@example.com
```

**Disable API Gateway:**
```bash
aws apigateway update-rest-api \
  --rest-api-id xxx \
  --patch-operations op=replace,path=/disableExecuteApiEndpoint,value=true
```

**Emergency Shutdown:**
```bash
# Destroy entire stack
cdk destroy --all --force
```

## Security Checklist

Before deployment:

- [ ] All secrets in environment variables or AWS Secrets Manager
- [ ] S3 buckets are private with encryption
- [ ] DynamoDB tables encrypted
- [ ] Cognito user pool configured with strong password policy
- [ ] JWT validation on all protected API endpoints
- [ ] Input validation on all user inputs
- [ ] Rate limiting configured
- [ ] CORS restricted to known origins
- [ ] Security headers configured (CSP, HSTS, etc.)
- [ ] CloudWatch alarms configured
- [ ] IAM roles follow least privilege
- [ ] Dependencies scanned for vulnerabilities
- [ ] No sensitive data logged
- [ ] Incident response plan documented

---

**Remember:** Security is not a feature, it's a requirement. Build it in from the start.
