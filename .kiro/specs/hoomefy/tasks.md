# Hoomefy Implementation Tasks

**Project:** Hoomefy - AI Home Decoration Application  
**Version:** 1.0.0  
**Last Updated:** November 5, 2026

## Task Status Legend

- ⬜ Not Started
- 🟦 In Progress
- ✅ Completed
- ⏸️ Blocked
- ⏭️ Deferred

---

## Milestone 1: Project Foundation & Planning

### TASK-1.1: Project Initialization ⬜
**Priority:** Critical  
**Estimated Time:** 2 hours

**Description:**  
Set up the complete project structure with frontend and backend directories, initialize package managers, configure TypeScript, and establish build tooling.

**Acceptance Criteria:**
- [ ] Root project structure created
- [ ] Frontend React + Vite project initialized
- [ ] Backend Lambda + CDK project initialized
- [ ] TypeScript configured for both
- [ ] Git repository initialized with .gitignore
- [ ] README.md with basic project info
- [ ] LICENSE file (MIT)

**Dependencies:** None

---

### TASK-1.2: Development Environment Configuration ⬜
**Priority:** High  
**Estimated Time:** 1 hour

**Description:**  
Configure development tools including linting, formatting, and editor settings for consistent code quality.

**Acceptance Criteria:**
- [ ] ESLint configured with React + TypeScript rules
- [ ] Prettier configured and integrated
- [ ] .editorconfig for consistent formatting
- [ ] Husky pre-commit hooks (optional)
- [ ] VS Code settings recommendations

**Dependencies:** TASK-1.1

---

### TASK-1.3: Kiro Steering Files ⬜
**Priority:** High  
**Estimated Time:** 1.5 hours

**Description:**  
Create comprehensive Kiro steering documentation to guide AI-assisted development throughout the project.

**Acceptance Criteria:**
- [ ] `.kiro/steering/product.md` - Product vision and requirements
- [ ] `.kiro/steering/tech.md` - Technology choices and conventions
- [ ] `.kiro/steering/structure.md` - Project structure guidelines
- [ ] `.kiro/steering/security.md` - Security standards and practices
- [ ] `.kiro/steering/testing.md` - Testing strategy and standards
- [ ] `.kiro/steering/design-guidelines.md` - UI/UX and visual design rules

**Dependencies:** TASK-1.1

---

### TASK-1.4: Kiro Agent Hooks ⬜
**Priority:** Medium  
**Estimated Time:** 1 hour

**Description:**  
Configure useful Kiro agent hooks for automated quality checks and development workflow automation.

**Acceptance Criteria:**
- [ ] PostFileSave hook: Run TypeScript type checking on `.ts`/`.tsx` files
- [ ] PostFileSave hook: Run ESLint on modified files
- [ ] PreToolUse hook: Review write operations for coding standards (optional)
- [ ] SessionStart hook: Display project status and reminders
- [ ] Hooks documented in README

**Dependencies:** TASK-1.2

---

## Milestone 2: Frontend Foundation

### TASK-2.1: Design System Setup ⬜
**Priority:** Critical  
**Estimated Time:** 3 hours

**Description:**  
Set up Tailwind CSS, configure the color palette, typography, and install shadcn/ui component library.

**Acceptance Criteria:**
- [ ] Tailwind CSS installed and configured
- [ ] Custom color palette defined (midnight navy, deep purple, warm amber, ivory, gold)
- [ ] Typography scale configured
- [ ] shadcn/ui CLI installed
- [ ] Base components added (Button, Input, Card, Dialog, Toast)
- [ ] Global CSS with custom properties
- [ ] Design tokens documented

**Dependencies:** TASK-1.1

---

### TASK-2.2: Routing and Navigation ⬜
**Priority:** Critical  
**Estimated Time:** 2 hours

**Description:**  
Implement React Router with all application routes and create the base navigation components.

**Acceptance Criteria:**
- [ ] React Router installed and configured
- [ ] All routes defined (Home, Studio, Gallery, Auth, etc.)
- [ ] Header component with navigation links
- [ ] Footer component with site links
- [ ] Mobile hamburger menu
- [ ] 404 Not Found page
- [ ] Protected route wrapper for authenticated pages

**Dependencies:** TASK-2.1

---

### TASK-2.3: State Management Setup ⬜
**Priority:** High  
**Estimated Time:** 2 hours

**Description:**  
Configure Zustand stores for auth, studio, and UI state management.

**Acceptance Criteria:**
- [ ] Zustand installed
- [ ] Auth store with user, tokens, auth methods
- [ ] Studio store with image, room type, style, preferences
- [ ] UI store with haunted mode toggle, theme
- [ ] Store persistence configured (localStorage)
- [ ] TypeScript types for all stores

**Dependencies:** TASK-2.1

---

### TASK-2.4: API Client Configuration ⬜
**Priority:** High  
**Estimated Time:** 2 hours

**Description:**  
Set up Axios API client with authentication interceptors and React Query for server state management.

**Acceptance Criteria:**
- [ ] Axios installed and configured
- [ ] Base API URL from environment variable
- [ ] Auth interceptor adds JWT to requests
- [ ] Response interceptor handles 401 (token refresh)
- [ ] React Query installed and configured
- [ ] API service modules structured
- [ ] Error handling utilities

**Dependencies:** TASK-2.3

---

## Milestone 3: Landing Page & Static Content

### TASK-3.1: Homepage Hero Section ⬜
**Priority:** High  
**Estimated Time:** 3 hours

**Description:**  
Create an impressive, cinematic hero section with headline, tagline, and primary CTA.

**Acceptance Criteria:**
- [ ] Hero component with full-viewport height
- [ ] "Your Dream Home, Reimagined" headline
- [ ] Supporting tagline
- [ ] "Design My Room" CTA button
- [ ] Background gradient with subtle animation
- [ ] Responsive layout (mobile, tablet, desktop)
- [ ] Smooth scroll to next section

**Dependencies:** TASK-2.2

---

### TASK-3.2: Style Showcase Section ⬜
**Priority:** High  
**Estimated Time:** 2 hours

**Description:**  
Display interior design style preview cards with images and descriptions.

**Acceptance Criteria:**
- [ ] Grid layout of style cards (10 styles)
- [ ] Each card: image, title, description
- [ ] Hover effects and animations
- [ ] Responsive grid (1-3 columns)
- [ ] Style images sourced (placeholder or real)
- [ ] Click navigates to Design Studio with pre-selected style

**Dependencies:** TASK-3.1

---

### TASK-3.3: How It Works Section ⬜
**Priority:** Medium  
**Estimated Time:** 2 hours

**Description:**  
Visualize the three-step workflow: Upload → Choose Style → Transform.

**Acceptance Criteria:**
- [ ] Three-step visual explanation
- [ ] Icons for each step
- [ ] Clear, concise descriptions
- [ ] Animated transitions on scroll (optional)
- [ ] CTA to try the application

**Dependencies:** TASK-3.1

---

### TASK-3.4: Sample Gallery ⬜
**Priority:** Medium  
**Estimated Time:** 2 hours

**Description:**  
Create a gallery of before/after transformation examples visible to all visitors.

**Acceptance Criteria:**
- [ ] Grid of before/after image pairs
- [ ] Interactive hover to reveal after image
- [ ] Or slider comparison on each card
- [ ] Sample images prepared (6-8 examples)
- [ ] Lightbox view for full-size images
- [ ] Mobile-friendly layout

**Dependencies:** TASK-3.1

---

### TASK-3.5: Additional Static Pages ⬜
**Priority:** Low  
**Estimated Time:** 2 hours

**Description:**  
Create How It Works, About, Privacy Policy, and Terms of Use pages.

**Acceptance Criteria:**
- [ ] How It Works page with detailed workflow explanation
- [ ] About page with project description and team info
- [ ] Privacy Policy page (template adapted)
- [ ] Terms of Use page (template adapted)
- [ ] Consistent page layout and styling

**Dependencies:** TASK-2.2

---

## Milestone 4: Photo Upload & Management

### TASK-4.1: Photo Upload Component ⬜
**Priority:** Critical  
**Estimated Time:** 4 hours

**Description:**  
Build a drag-and-drop photo upload interface with file selection and validation.

**Acceptance Criteria:**
- [ ] Drag-and-drop upload zone
- [ ] Click-to-browse file input
- [ ] File validation (type, size, dimensions)
- [ ] Client-side image compression
- [ ] Upload progress indicator
- [ ] Error messages for invalid files
- [ ] Preview of uploaded image
- [ ] Replace/remove image actions

**Dependencies:** TASK-2.4

---

### TASK-4.2: Camera Capture (Mobile) ⬜
**Priority:** Medium  
**Estimated Time:** 2 hours

**Description:**  
Add camera capture functionality for mobile devices using browser APIs.

**Acceptance Criteria:**
- [ ] Camera capture button (mobile only)
- [ ] Request camera permissions
- [ ] Display camera stream
- [ ] Capture photo button
- [ ] Preview captured photo
- [ ] Retake option
- [ ] Touch-friendly interface

**Dependencies:** TASK-4.1

---

### TASK-4.3: Image Editing Tools ⬜
**Priority:** Low  
**Estimated Time:** 3 hours

**Description:**  
Provide basic image editing: rotate and crop.

**Acceptance Criteria:**
- [ ] Rotate image buttons (90° increments)
- [ ] Crop tool with adjustable frame
- [ ] Maintain aspect ratio option
- [ ] Apply/cancel edit actions
- [ ] Preview updates in real-time
- [ ] Edits applied to uploaded file

**Dependencies:** TASK-4.1

---

## Milestone 5: Design Studio Interface

### TASK-5.1: Design Studio Layout ⬜
**Priority:** Critical  
**Estimated Time:** 3 hours

**Description:**  
Create three-panel design studio layout: controls, image viewer, assistant.

**Acceptance Criteria:**
- [ ] Responsive three-panel layout
- [ ] Left panel: room/style controls
- [ ] Center panel: image preview
- [ ] Right panel: Mori assistant
- [ ] Mobile: stacked vertical layout
- [ ] Smooth panel transitions
- [ ] Persistent state across navigation

**Dependencies:** TASK-2.2, TASK-2.3

---

### TASK-5.2: Room Type Selector ⬜
**Priority:** High  
**Estimated Time:** 1 hour

**Description:**  
Implement room type selection component.

**Acceptance Criteria:**
- [ ] Dropdown or button group selector
- [ ] Options: Living Room, Bedroom, Kitchen, Dining Room, Home Office, Bathroom, Other
- [ ] Icons for each room type
- [ ] Selected state clearly indicated
- [ ] Updates studio store on change

**Dependencies:** TASK-5.1

---

### TASK-5.3: Style Selector ⬜
**Priority:** High  
**Estimated Time:** 2 hours

**Description:**  
Implement interior design style selection with visual previews.

**Acceptance Criteria:**
- [ ] Grid of style cards
- [ ] 10 styles with preview images
- [ ] Selected style highlighted
- [ ] Style descriptions on hover/click
- [ ] Updates studio store on change
- [ ] Mobile-friendly layout

**Dependencies:** TASK-5.1

---

### TASK-5.4: Preferences Panel ⬜
**Priority:** Medium  
**Estimated Time:** 2 hours

**Description:**  
Create UI for design preferences: color palette, intensity, custom instructions.

**Acceptance Criteria:**
- [ ] Color palette selector (warm, cool, neutral, bold)
- [ ] Intensity slider (0-100)
- [ ] Custom instructions textarea (500 char limit)
- [ ] Character counter
- [ ] Validation and helpful tooltips
- [ ] Updates studio store on change

**Dependencies:** TASK-5.1

---

### TASK-5.5: Image Viewer Component ⬜
**Priority:** High  
**Estimated Time:** 3 hours

**Description:**  
Build large image viewer with zoom, fullscreen, and comparison modes.

**Acceptance Criteria:**
- [ ] Display uploaded or generated image
- [ ] Zoom controls (2x, 4x)
- [ ] Pan/drag when zoomed
- [ ] Fullscreen mode
- [ ] Smooth transitions between images
- [ ] Loading states
- [ ] Responsive sizing

**Dependencies:** TASK-5.1

---

### TASK-5.6: Generate Button & Workflow ⬜
**Priority:** Critical  
**Estimated Time:** 2 hours

**Description:**  
Implement the primary "Generate Design" action button and validation.

**Acceptance Criteria:**
- [ ] Prominent "Generate Design" button
- [ ] Disabled when image not uploaded or user not authenticated
- [ ] Validation before submission
- [ ] Triggers generation API call
- [ ] Transitions to progress view
- [ ] Error handling and user feedback

**Dependencies:** TASK-5.5, TASK-2.4

---

## Milestone 6: Before/After Comparison

### TASK-6.1: Slider Comparison Component ⬜
**Priority:** High  
**Estimated Time:** 3 hours

**Description:**  
Build interactive slider to reveal before/after images.

**Acceptance Criteria:**
- [ ] Draggable slider divider
- [ ] Smooth dragging experience
- [ ] Touch support for mobile
- [ ] Images aligned perfectly
- [ ] Slider position indicator
- [ ] Keyboard accessibility (arrow keys)

**Dependencies:** TASK-5.5

---

### TASK-6.2: Side-by-Side Comparison ⬜
**Priority:** Medium  
**Estimated Time:** 2 hours

**Description:**  
Display original and generated images side by side.

**Acceptance Criteria:**
- [ ] Two-column layout
- [ ] Labels: "Original" and "Redesigned"
- [ ] Synchronized zoom and pan
- [ ] Responsive: stacks on mobile
- [ ] Smooth transitions

**Dependencies:** TASK-6.1

---

### TASK-6.3: Toggle View Mode ⬜
**Priority:** Medium  
**Estimated Time:** 1 hour

**Description:**  
Allow users to click/tap to toggle between before and after images.

**Acceptance Criteria:**
- [ ] Click image to switch
- [ ] Fade transition between images
- [ ] Current image indicator
- [ ] Works on mobile tap
- [ ] Accessible (keyboard support)

**Dependencies:** TASK-6.1

---

### TASK-6.4: Download and Save Actions ⬜
**Priority:** High  
**Estimated Time:** 2 hours

**Description:**  
Implement download and save-to-gallery actions for generated images.

**Acceptance Criteria:**
- [ ] Download original button
- [ ] Download generated button
- [ ] Download side-by-side comparison
- [ ] Save to gallery button
- [ ] Project naming dialog
- [ ] Success/error feedback
- [ ] Mobile-friendly download handling

**Dependencies:** TASK-6.1, TASK-2.4

---

## Milestone 7: Personal Gallery

### TASK-7.1: Project Gallery Page ⬜
**Priority:** High  
**Estimated Time:** 3 hours

**Description:**  
Create a grid view of user's saved projects.

**Acceptance Criteria:**
- [ ] Grid layout of project cards
- [ ] Each card: thumbnail, name, date, style
- [ ] Hover shows before/after preview
- [ ] Click opens project detail
- [ ] Empty state with CTA
- [ ] Loading skeleton states
- [ ] Responsive grid (1-4 columns)

**Dependencies:** TASK-2.4

---

### TASK-7.2: Project Detail View ⬜
**Priority:** High  
**Estimated Time:** 2 hours

**Description:**  
Full view of a saved project with all details and actions.

**Acceptance Criteria:**
- [ ] Display original and generated images
- [ ] Project name, date, style, room type
- [ ] Design preferences used
- [ ] Before/after comparison controls
- [ ] Download actions
- [ ] Edit project name
- [ ] Delete project (with confirmation)
- [ ] Regenerate with same/different settings

**Dependencies:** TASK-7.1

---

### TASK-7.3: Gallery Filters and Search ⬜
**Priority:** Low  
**Estimated Time:** 2 hours

**Description:**  
Add filtering and search capabilities to the gallery.

**Acceptance Criteria:**
- [ ] Sort by date, name
- [ ] Filter by room type
- [ ] Filter by style
- [ ] Search by project name
- [ ] Clear filters button
- [ ] Filter state in URL query params

**Dependencies:** TASK-7.1

---

### TASK-7.4: Bulk Actions ⬜
**Priority:** Low  
**Estimated Time:** 2 hours

**Description:**  
Allow selecting multiple projects for bulk operations.

**Acceptance Criteria:**
- [ ] Checkbox selection on project cards
- [ ] Select all / deselect all
- [ ] Delete selected projects
- [ ] Bulk action toolbar
- [ ] Confirmation for destructive actions

**Dependencies:** TASK-7.1

---

## Milestone 8: Authentication & User Management

### TASK-8.1: Sign-Up Page ⬜
**Priority:** Critical  
**Estimated Time:** 3 hours

**Description:**  
Create user registration flow with email/password.

**Acceptance Criteria:**
- [ ] Sign-up form (email, password, confirm password)
- [ ] Client-side validation
- [ ] Password strength indicator
- [ ] Terms and privacy policy checkboxes
- [ ] Cognito SignUp API integration
- [ ] Email verification flow
- [ ] Error handling (account exists, weak password)
- [ ] Redirect to sign-in after verification

**Dependencies:** TASK-2.4

---

### TASK-8.2: Sign-In Page ⬜
**Priority:** Critical  
**Estimated Time:** 2 hours

**Description:**  
Create user login flow.

**Acceptance Criteria:**
- [ ] Sign-in form (email, password)
- [ ] "Remember me" checkbox
- [ ] Cognito InitiateAuth API integration
- [ ] Store JWT tokens securely
- [ ] Redirect to intended page after login
- [ ] Error handling (invalid credentials, unverified email)
- [ ] Link to sign-up and forgot password

**Dependencies:** TASK-8.1

---

### TASK-8.3: Forgot Password Flow ⬜
**Priority:** Medium  
**Estimated Time:** 2 hours

**Description:**  
Implement password reset functionality.

**Acceptance Criteria:**
- [ ] Request reset form (email)
- [ ] Cognito ForgotPassword API
- [ ] Verification code input
- [ ] New password form
- [ ] Cognito ConfirmForgotPassword API
- [ ] Success message and redirect to sign-in

**Dependencies:** TASK-8.2

---

### TASK-8.4: Protected Routes ⬜
**Priority:** Critical  
**Estimated Time:** 2 hours

**Description:**  
Implement route guards for authenticated-only pages.

**Acceptance Criteria:**
- [ ] ProtectedRoute wrapper component
- [ ] Check authentication state
- [ ] Redirect to sign-in if not authenticated
- [ ] Store intended destination for post-login redirect
- [ ] Apply to Design Studio, Gallery, Account pages

**Dependencies:** TASK-8.2, TASK-2.3

---

### TASK-8.5: Token Refresh Logic ⬜
**Priority:** High  
**Estimated Time:** 2 hours

**Description:**  
Implement automatic token refresh when access token expires.

**Acceptance Criteria:**
- [ ] Detect expired token from API 401 response
- [ ] Use refresh token to get new tokens
- [ ] Update auth store with new tokens
- [ ] Retry failed request with new token
- [ ] Logout user if refresh fails
- [ ] Background token refresh before expiry

**Dependencies:** TASK-8.2

---

### TASK-8.6: User Profile Page ⬜
**Priority:** Low  
**Estimated Time:** 2 hours

**Description:**  
Display user account information and settings.

**Acceptance Criteria:**
- [ ] Display email, account creation date
- [ ] Haunted mode toggle
- [ ] Usage stats (quota used, projects count)
- [ ] Change password option (optional)
- [ ] Delete account option (optional)
- [ ] Logout button

**Dependencies:** TASK-8.2

---

## Milestone 9: Haunted Experience

### TASK-9.1: Haunted Mode Toggle ⬜
**Priority:** High  
**Estimated Time:** 1 hour

**Description:**  
Implement toggle to enable/disable haunted effects.

**Acceptance Criteria:**
- [ ] Toggle switch in header or settings
- [ ] State stored in UI store and persisted
- [ ] Instant effect when toggled
- [ ] Clear labels ("Normal Mode" / "Haunted Mode")
- [ ] Icon indicators

**Dependencies:** TASK-2.3

---

### TASK-9.2: Atmospheric Effects ⬜
**Priority:** Medium  
**Estimated Time:** 4 hours

**Description:**  
Create subtle fog, particles, and shadow animations.

**Acceptance Criteria:**
- [ ] Animated fog overlay (CSS or canvas)
- [ ] Floating magical particles (Framer Motion or CSS)
- [ ] Moving shadow layers
- [ ] Candlelight flicker effects (optional)
- [ ] Performance optimized (60fps)
- [ ] Disabled in Normal Mode
- [ ] Respects prefers-reduced-motion

**Dependencies:** TASK-9.1

---

### TASK-9.3: Mori Ghost Character ⬜
**Priority:** High  
**Estimated Time:** 3 hours

**Description:**  
Design and animate Mori, the friendly ghost mascot.

**Acceptance Criteria:**
- [ ] Mori character design (SVG or Lottie)
- [ ] Friendly, non-scary appearance
- [ ] Subtle floating animation
- [ ] Appears in Design Studio right panel
- [ ] Contextual messages based on user actions
- [ ] Different expressions/poses for states
- [ ] Hidden in Normal Mode

**Dependencies:** TASK-9.1, TASK-5.1

---

### TASK-9.4: Contextual Mori Messages ⬜
**Priority:** Medium  
**Estimated Time:** 2 hours

**Description:**  
Implement dynamic messages from Mori based on user context.

**Acceptance Criteria:**
- [ ] Message system with different scenarios:
  - First upload: "Let's give this space a little magic."
  - During generation: "Your new look is almost ready!"
  - Success: "Careful... this design might be too beautiful to haunt."
  - Style selection: "Would you like something brighter, cozier, or more luxurious?"
- [ ] Messages update based on selected room type and style
- [ ] Smooth fade-in/out transitions
- [ ] Speech bubble design

**Dependencies:** TASK-9.3

---

### TASK-9.5: Magical UI Interactions ⬜
**Priority:** Medium  
**Estimated Time:** 3 hours

**Description:**  
Add supernatural effects to buttons and UI elements.

**Acceptance Criteria:**
- [ ] Button hover glow effects
- [ ] Particle trails on cursor during certain actions
- [ ] Success animations with ghost silhouettes
- [ ] Form inputs with magical focus effects
- [ ] Smooth, sophisticated animations
- [ ] Performance optimized
- [ ] Disabled in Normal Mode

**Dependencies:** TASK-9.1

---

### TASK-9.6: Transformation Ritual Animation ⬜
**Priority:** Medium  
**Estimated Time:** 3 hours

**Description:**  
Create a magical animation sequence during AI generation.

**Acceptance Criteria:**
- [ ] Animated magical doorway or portal
- [ ] Swirling energy/particles effect
- [ ] Mori appears to guide the transformation
- [ ] Candlelight or ambient glow
- [ ] Smooth loop until generation completes
- [ ] Alternative simple animation for Normal Mode
- [ ] Respects reduced-motion preferences

**Dependencies:** TASK-9.3

---

### TASK-9.7: Easter Eggs ⬜
**Priority:** Low  
**Estimated Time:** 2 hours

**Description:**  
Add hidden delightful interactions throughout the interface.

**Acceptance Criteria:**
- [ ] Click Mori for surprise animation
- [ ] Konami code or secret key combination
- [ ] Hidden messages in console
- [ ] Rare random ghost appearances
- [ ] Special effect on certain dates (Halloween)
- [ ] Non-intrusive and fun

**Dependencies:** TASK-9.3

---

## Milestone 10: Backend Infrastructure (AWS CDK)

### TASK-10.1: CDK Project Initialization ⬜
**Priority:** Critical  
**Estimated Time:** 2 hours

**Description:**  
Initialize AWS CDK project with TypeScript and configure base infrastructure.

**Acceptance Criteria:**
- [ ] CDK project created in `backend/infrastructure`
- [ ] TypeScript configuration
- [ ] CDK context and config files
- [ ] Environment variable handling
- [ ] Stack organization structure
- [ ] Deployment scripts

**Dependencies:** TASK-1.1

---

### TASK-10.2: Auth Stack (Cognito) ⬜
**Priority:** Critical  
**Estimated Time:** 3 hours

**Description:**  
Create Cognito User Pool and configure authentication.

**Acceptance Criteria:**
- [ ] Cognito User Pool created
- [ ] Email/password authentication configured
- [ ] Password policy set
- [ ] Email verification enabled
- [ ] User Pool Client created
- [ ] PostConfirmation Lambda trigger
- [ ] Outputs: User Pool ID, Client ID

**Dependencies:** TASK-10.1

---

### TASK-10.3: Storage Stack (S3 + DynamoDB) ⬜
**Priority:** Critical  
**Estimated Time:** 3 hours

**Description:**  
Create S3 bucket for images and DynamoDB table for data.

**Acceptance Criteria:**
- [ ] S3 bucket with private access
- [ ] Bucket encryption enabled
- [ ] CORS configuration
- [ ] Lifecycle policy (90-day deletion)
- [ ] DynamoDB table with PK/SK design
- [ ] GSI for user queries
- [ ] On-demand billing
- [ ] Outputs: Bucket name, Table name

**Dependencies:** TASK-10.1

---

### TASK-10.4: Queue Stack (SQS) ⬜
**Priority:** High  
**Estimated Time:** 1 hour

**Description:**  
Create SQS queue for generation jobs with DLQ.

**Acceptance Criteria:**
- [ ] Main job queue created
- [ ] Dead-letter queue for failures
- [ ] Visibility timeout: 300 seconds
- [ ] Max receive count: 3
- [ ] Message retention: 4 days
- [ ] Outputs: Queue URL, Queue ARN

**Dependencies:** TASK-10.1

---

### TASK-10.5: API Stack (API Gateway + Lambda) ⬜
**Priority:** Critical  
**Estimated Time:** 4 hours

**Description:**  
Create API Gateway with Lambda integrations for all endpoints.

**Acceptance Criteria:**
- [ ] API Gateway REST API created
- [ ] Cognito authorizer configured
- [ ] CORS configured
- [ ] Lambda functions for each endpoint:
  - POST /uploads
  - POST /generations
  - GET /generations/{jobId}
  - GET /projects
  - GET /projects/{id}
  - PATCH /projects/{id}
  - DELETE /projects/{id}
  - GET /account
  - GET /usage
- [ ] Request/response models
- [ ] IAM permissions for Lambdas
- [ ] Outputs: API URL

**Dependencies:** TASK-10.2, TASK-10.3

---

### TASK-10.6: Compute Stack (Generation Worker) ⬜
**Priority:** Critical  
**Estimated Time:** 3 hours

**Description:**  
Create Lambda function for asynchronous generation processing.

**Acceptance Criteria:**
- [ ] Generation worker Lambda created
- [ ] SQS event source mapping
- [ ] Increased timeout (5 minutes)
- [ ] Increased memory (2048 MB)
- [ ] IAM permissions for DynamoDB, S3, Bedrock, SQS
- [ ] Environment variables for config
- [ ] Dead-letter queue configured

**Dependencies:** TASK-10.3, TASK-10.4

---

## Milestone 11: Backend Services & Logic

### TASK-11.1: DynamoDB Service ⬜
**Priority:** High  
**Estimated Time:** 3 hours

**Description:**  
Create service layer for DynamoDB operations.

**Acceptance Criteria:**
- [ ] CRUD methods for User profiles
- [ ] CRUD methods for Projects
- [ ] CRUD methods for Generation Jobs
- [ ] Query methods for access patterns
- [ ] TypeScript types for all entities
- [ ] Error handling
- [ ] Unit tests

**Dependencies:** TASK-10.3

---

### TASK-11.2: S3 Service ⬜
**Priority:** High  
**Estimated Time:** 2 hours

**Description:**  
Create service layer for S3 operations.

**Acceptance Criteria:**
- [ ] Generate presigned upload URLs
- [ ] Generate presigned download URLs
- [ ] Upload image method
- [ ] Download image method
- [ ] Delete image method
- [ ] Set object metadata
- [ ] Error handling
- [ ] Unit tests

**Dependencies:** TASK-10.3

---

### TASK-11.3: SQS Service ⬜
**Priority:** Medium  
**Estimated Time:** 1 hour

**Description:**  
Create service layer for SQS operations.

**Acceptance Criteria:**
- [ ] Send message to job queue
- [ ] Receive messages (worker)
- [ ] Delete message after processing
- [ ] Change message visibility
- [ ] Error handling
- [ ] Unit tests

**Dependencies:** TASK-10.4

---

### TASK-11.4: Image Generation Provider Interface ⬜
**Priority:** Critical  
**Estimated Time:** 2 hours

**Description:**  
Define abstract interface for AI image generation providers.

**Acceptance Criteria:**
- [ ] TypeScript interface defined
- [ ] Methods: generateTransformation, getStatus, cancel
- [ ] Input/output types defined
- [ ] Documentation for implementing providers
- [ ] Factory pattern for provider selection

**Dependencies:** None

---

### TASK-11.5: Mock Image Generation Provider ⬜
**Priority:** Critical  
**Estimated Time:** 3 hours

**Description:**  
Implement mock provider that returns sample transformations without AWS Bedrock.

**Acceptance Criteria:**
- [ ] Implements ImageGenerationProvider interface
- [ ] Returns predefined sample images based on style
- [ ] Simulates realistic latency (5-10 seconds)
- [ ] Logs clearly as mock generation
- [ ] Sample images prepared for all styles
- [ ] No external dependencies
- [ ] Unit tests

**Dependencies:** TASK-11.4

---

### TASK-11.6: Bedrock Image Generation Provider ⬜
**Priority:** High  
**Estimated Time:** 4 hours

**Description:**  
Implement real Bedrock provider using Stability AI model.

**Acceptance Criteria:**
- [ ] Implements ImageGenerationProvider interface
- [ ] Invokes Bedrock InvokeModel API
- [ ] Uses Stability AI Stable Image Control Structure
- [ ] Structured prompt construction
- [ ] Image encoding/decoding
- [ ] Error handling (quota, model access, timeouts)
- [ ] Retry logic for transient failures
- [ ] Logs model invocation
- [ ] Integration tests (manual, with real AWS)

**Dependencies:** TASK-11.4

---

### TASK-11.7: Prompt Engineering ⬜
**Priority:** High  
**Estimated Time:** 3 hours

**Description:**  
Create structured prompts for each design style with constraints.

**Acceptance Criteria:**
- [ ] Base prompt template defined
- [ ] Style-specific guidance for all 10 styles
- [ ] Room type context integration
- [ ] Color palette instructions
- [ ] Intensity parameter handling
- [ ] Custom instructions insertion
- [ ] Preservation constraints clearly stated
- [ ] Prompt utility functions
- [ ] Documentation of prompt strategy

**Dependencies:** TASK-11.4

---

## Milestone 12: API Handlers Implementation

### TASK-12.1: POST /api/uploads Handler ⬜
**Priority:** High  
**Estimated Time:** 2 hours

**Description:**  
Implement handler to generate presigned upload URLs.

**Acceptance Criteria:**
- [ ] Validate request (contentType, fileSize)
- [ ] Check user quota
- [ ] Generate unique image key
- [ ] Create presigned S3 URL (15 min expiry)
- [ ] Return uploadUrl and imageKey
- [ ] Error handling
- [ ] Integration test

**Dependencies:** TASK-11.2

---

### TASK-12.2: POST /api/generations Handler ⬜
**Priority:** Critical  
**Estimated Time:** 3 hours

**Description:**  
Implement handler to create generation jobs.

**Acceptance Criteria:**
- [ ] Validate request payload
- [ ] Check image exists and belongs to user
- [ ] Check user quota (daily limit)
- [ ] Create generation job in DynamoDB
- [ ] Send message to SQS queue
- [ ] Increment user quota
- [ ] Return jobId and projectId
- [ ] Error handling
- [ ] Integration test

**Dependencies:** TASK-11.1, TASK-11.3

---

### TASK-12.3: GET /api/generations/{jobId} Handler ⬜
**Priority:** Critical  
**Estimated Time:** 2 hours

**Description:**  
Implement handler to get generation job status.

**Acceptance Criteria:**
- [ ] Fetch job from DynamoDB
- [ ] Verify job belongs to user
- [ ] Return job status and details
- [ ] Generate presigned URL for result if completed
- [ ] Error handling (job not found)
- [ ] Integration test

**Dependencies:** TASK-11.1, TASK-11.2

---

### TASK-12.4: GET /api/projects Handler ⬜
**Priority:** High  
**Estimated Time:** 2 hours

**Description:**  
Implement handler to list user's projects.

**Acceptance Criteria:**
- [ ] Query projects by userId
- [ ] Support pagination (limit, cursor)
- [ ] Support sorting (date, name)
- [ ] Generate presigned URLs for images
- [ ] Return projects array and next cursor
- [ ] Error handling
- [ ] Integration test

**Dependencies:** TASK-11.1, TASK-11.2

---

### TASK-12.5: GET /api/projects/{id} Handler ⬜
**Priority:** High  
**Estimated Time:** 1 hour

**Description:**  
Implement handler to get project details.

**Acceptance Criteria:**
- [ ] Fetch project from DynamoDB
- [ ] Verify project belongs to user
- [ ] Generate presigned URLs for images
- [ ] Return full project details
- [ ] Error handling (project not found)
- [ ] Integration test

**Dependencies:** TASK-11.1, TASK-11.2

---

### TASK-12.6: PATCH /api/projects/{id} Handler ⬜
**Priority:** Medium  
**Estimated Time:** 1 hour

**Description:**  
Implement handler to update project (rename).

**Acceptance Criteria:**
- [ ] Validate request (name)
- [ ] Verify project belongs to user
- [ ] Update project in DynamoDB
- [ ] Return updated project
- [ ] Error handling
- [ ] Integration test

**Dependencies:** TASK-11.1

---

### TASK-12.7: DELETE /api/projects/{id} Handler ⬜
**Priority:** Medium  
**Estimated Time:** 2 hours

**Description:**  
Implement handler to delete project and images.

**Acceptance Criteria:**
- [ ] Verify project belongs to user
- [ ] Delete images from S3
- [ ] Delete project from DynamoDB
- [ ] Return success response
- [ ] Error handling
- [ ] Integration test

**Dependencies:** TASK-11.1, TASK-11.2

---

### TASK-12.8: GET /api/account & /api/usage Handlers ⬜
**Priority:** Low  
**Estimated Time:** 1 hour

**Description:**  
Implement handlers for user account and usage information.

**Acceptance Criteria:**
- [ ] GET /account returns user profile
- [ ] GET /usage returns quota and stats
- [ ] Query project count for user
- [ ] Calculate storage used (optional)
- [ ] Error handling
- [ ] Integration tests

**Dependencies:** TASK-11.1

---

## Milestone 13: Generation Worker Implementation

### TASK-13.1: Generation Worker Core Logic ⬜
**Priority:** Critical  
**Estimated Time:** 4 hours

**Description:**  
Implement Lambda function that processes generation jobs from SQS.

**Acceptance Criteria:**
- [ ] Receive SQS messages
- [ ] Parse job details from message
- [ ] Update job status to "processing" in DynamoDB
- [ ] Download original image from S3
- [ ] Call ImageGenerationProvider
- [ ] Upload generated image to S3
- [ ] Update job status to "completed" with result
- [ ] Handle failures, update status to "failed"
- [ ] Delete SQS message on success
- [ ] Log all steps

**Dependencies:** TASK-11.1, TASK-11.2, TASK-11.4

---

### TASK-13.2: Image Preprocessing ⬜
**Priority:** Medium  
**Estimated Time:** 2 hours

**Description:**  
Validate and preprocess images before sending to AI provider.

**Acceptance Criteria:**
- [ ] Validate image format and dimensions
- [ ] Resize if too large (max 2048px)
- [ ] Compress if file size too large
- [ ] Convert to optimal format for provider
- [ ] Maintain aspect ratio
- [ ] Error handling for corrupt images

**Dependencies:** TASK-13.1

---

### TASK-13.3: Error Handling & Retries ⬜
**Priority:** High  
**Estimated Time:** 2 hours

**Description:**  
Implement comprehensive error handling and retry logic.

**Acceptance Criteria:**
- [ ] Catch and log all errors
- [ ] Distinguish transient vs permanent errors
- [ ] Retry transient errors (network, throttling)
- [ ] Exponential backoff for retries
- [ ] Max 3 retry attempts
- [ ] Update job with error message
- [ ] Send failed jobs to DLQ
- [ ] Alert on repeated failures

**Dependencies:** TASK-13.1

---

### TASK-13.4: Project Creation from Job ⬜
**Priority:** Medium  
**Estimated Time:** 2 hours

**Description:**  
Create or update project entity after successful generation.

**Acceptance Criteria:**
- [ ] Check if projectId exists in job
- [ ] Create new project or update existing
- [ ] Set project metadata (name, style, roomType, etc.)
- [ ] Link original and generated image keys
- [ ] Set timestamps
- [ ] Associate with user

**Dependencies:** TASK-13.1, TASK-11.1

---

## Milestone 14: Generation Progress & Polling

### TASK-14.1: Generation Progress Component ⬜
**Priority:** High  
**Estimated Time:** 3 hours

**Description:**  
Create animated progress overlay during generation.

**Acceptance Criteria:**
- [ ] Full-screen overlay
- [ ] Progress stages: Uploading → Preparing → Generating → Finalizing
- [ ] Stage transitions based on real job status
- [ ] Mori appears with encouraging messages
- [ ] Transformation ritual animation
- [ ] Cancel button (optional)
- [ ] Error state handling
- [ ] Respects reduced-motion

**Dependencies:** TASK-9.3

---

### TASK-14.2: Job Status Polling ⬜
**Priority:** High  
**Estimated Time:** 2 hours

**Description:**  
Implement polling mechanism to check generation job status.

**Acceptance Criteria:**
- [ ] Poll GET /api/generations/{jobId} every 3 seconds
- [ ] Update progress component based on status
- [ ] Stop polling on "completed" or "failed"
- [ ] Handle network errors (retry)
- [ ] Timeout after 90 seconds
- [ ] Navigate to results view on completion

**Dependencies:** TASK-14.1

---

### TASK-14.3: Success and Failure States ⬜
**Priority:** High  
**Estimated Time:** 2 hours

**Description:**  
Handle generation completion and failure scenarios.

**Acceptance Criteria:**
- [ ] Success: Display generated image with celebration
- [ ] Failure: Show error message with retry option
- [ ] Timeout: Offer to check back later
- [ ] Mori reactions for success/failure
- [ ] Navigation options (view result, try again, go to gallery)

**Dependencies:** TASK-14.2

---

## Milestone 15: Testing & Quality Assurance

### TASK-15.1: Unit Tests - Frontend ⬜
**Priority:** Medium  
**Estimated Time:** 4 hours

**Description:**  
Write unit tests for React hooks, utilities, and services.

**Acceptance Criteria:**
- [ ] Tests for auth hooks
- [ ] Tests for API services
- [ ] Tests for validation utilities
- [ ] Tests for store logic
- [ ] Tests for image processing utilities
- [ ] >80% code coverage
- [ ] Vitest or Jest configured

**Dependencies:** Relevant frontend tasks

---

### TASK-15.2: Unit Tests - Backend ⬜
**Priority:** Medium  
**Estimated Time:** 4 hours

**Description:**  
Write unit tests for backend services and utilities.

**Acceptance Criteria:**
- [ ] Tests for DynamoDB service
- [ ] Tests for S3 service
- [ ] Tests for SQS service
- [ ] Tests for prompt generation
- [ ] Tests for mock provider
- [ ] >80% code coverage
- [ ] Jest configured

**Dependencies:** Relevant backend tasks

---

### TASK-15.3: Integration Tests - API ⬜
**Priority:** Medium  
**Estimated Time:** 4 hours

**Description:**  
Write integration tests for API endpoints.

**Acceptance Criteria:**
- [ ] Tests for all API handlers
- [ ] Mock AWS services (DynamoDB, S3, SQS)
- [ ] Test authentication flows
- [ ] Test error scenarios
- [ ] Test validation logic
- [ ] CI-compatible test setup

**Dependencies:** TASK-12.1-12.8

---

### TASK-15.4: End-to-End Tests ⬜
**Priority:** Low  
**Estimated Time:** 6 hours

**Description:**  
Write E2E tests for critical user flows.

**Acceptance Criteria:**
- [ ] Test: Sign up → Sign in → Upload → Generate → View result
- [ ] Test: Save to gallery → View gallery → Open project → Download
- [ ] Test: Toggle haunted mode
- [ ] Test: Responsive layouts (mobile, tablet, desktop)
- [ ] Playwright or Cypress configured
- [ ] Tests run in CI

**Dependencies:** All frontend and backend tasks

---

### TASK-15.5: Accessibility Audit ⬜
**Priority:** Medium  
**Estimated Time:** 3 hours

**Description:**  
Audit application for WCAG 2.2 AA compliance.

**Acceptance Criteria:**
- [ ] Keyboard navigation works throughout app
- [ ] Screen reader compatible (test with NVDA/VoiceOver)
- [ ] Color contrast meets 4.5:1 minimum
- [ ] All images have alt text
- [ ] Forms have proper labels and ARIA attributes
- [ ] Focus indicators visible
- [ ] No keyboard traps
- [ ] Reduced motion respected
- [ ] Fix identified issues

**Dependencies:** All frontend tasks

---

### TASK-15.6: Performance Optimization ⬜
**Priority:** Medium  
**Estimated Time:** 3 hours

**Description:**  
Optimize application performance.

**Acceptance Criteria:**
- [ ] Lighthouse score >90
- [ ] Bundle size analysis and optimization
- [ ] Code splitting for routes
- [ ] Lazy loading for images and components
- [ ] Image optimization (WebP, compression)
- [ ] React.memo for expensive components
- [ ] Debounce/throttle for expensive operations
- [ ] CDN for static assets (optional)

**Dependencies:** All frontend tasks

---

## Milestone 16: Deployment & Documentation

### TASK-16.1: Environment Configuration ⬜
**Priority:** High  
**Estimated Time:** 2 hours

**Description:**  
Set up environment variable configuration for all environments.

**Acceptance Criteria:**
- [ ] `.env.example` files for frontend and backend
- [ ] Environment-specific CDK context
- [ ] Configuration documentation
- [ ] Secrets management strategy (SSM Parameter Store)
- [ ] Provider selection via environment variable

**Dependencies:** TASK-10.1

---

### TASK-16.2: CDK Deployment Scripts ⬜
**Priority:** High  
**Estimated Time:** 2 hours

**Description:**  
Create scripts for infrastructure deployment.

**Acceptance Criteria:**
- [ ] `deploy.sh` script for full stack deployment
- [ ] `destroy.sh` script for infrastructure cleanup
- [ ] Environment selection (dev/staging/prod)
- [ ] Pre-deployment validation
- [ ] Post-deployment verification
- [ ] Deployment documentation

**Dependencies:** TASK-10.1-10.6

---

### TASK-16.3: Frontend Build & Deploy ⬜
**Priority:** High  
**Estimated Time:** 2 hours

**Description:**  
Configure frontend build and deployment process.

**Acceptance Criteria:**
- [ ] Vite production build configured
- [ ] Environment variables injected
- [ ] Build optimization (minification, tree-shaking)
- [ ] Deploy to S3 or Amplify Hosting
- [ ] CloudFront distribution (optional)
- [ ] Custom domain setup (optional)
- [ ] Deployment scripts

**Dependencies:** TASK-16.1

---

### TASK-16.4: CI/CD Pipeline ⬜
**Priority:** Low  
**Estimated Time:** 3 hours

**Description:**  
Set up automated CI/CD pipeline (GitHub Actions).

**Acceptance Criteria:**
- [ ] GitHub Actions workflow configured
- [ ] Triggers on push to main
- [ ] Run linter and type checks
- [ ] Run unit and integration tests
- [ ] Build frontend and backend
- [ ] Deploy to staging environment
- [ ] Manual approval for production
- [ ] Secrets management in GitHub

**Dependencies:** TASK-15.1-15.3, TASK-16.2

---

### TASK-16.5: Comprehensive README ⬜
**Priority:** High  
**Estimated Time:** 3 hours

**Description:**  
Write detailed README with all necessary information.

**Acceptance Criteria:**
- [ ] Project overview and features
- [ ] Architecture diagram (visual)
- [ ] Technology stack
- [ ] Prerequisites
- [ ] Local development setup
- [ ] Environment configuration
- [ ] AWS deployment instructions
- [ ] Running tests
- [ ] Troubleshooting guide
- [ ] Contributing guidelines
- [ ] License
- [ ] Screenshots/demo

**Dependencies:** All tasks

---

### TASK-16.6: API Documentation ⬜
**Priority:** Medium  
**Estimated Time:** 2 hours

**Description:**  
Create comprehensive API documentation.

**Acceptance Criteria:**
- [ ] OpenAPI/Swagger specification
- [ ] All endpoints documented
- [ ] Request/response schemas
- [ ] Authentication requirements
- [ ] Error codes and messages
- [ ] Example requests and responses
- [ ] Hosted documentation (Swagger UI or similar)

**Dependencies:** TASK-12.1-12.8

---

### TASK-16.7: Security & Cost Documentation ⬜
**Priority:** High  
**Estimated Time:** 2 hours

**Description:**  
Document security measures and cost considerations.

**Acceptance Criteria:**
- [ ] Security architecture document
- [ ] IAM permissions documented
- [ ] Data protection measures
- [ ] Compliance considerations
- [ ] Cost estimation breakdown
- [ ] Cost optimization tips
- [ ] AWS Budget setup instructions
- [ ] Monitoring and alerting guide

**Dependencies:** TASK-10.1-10.6

---

### TASK-16.8: Judge Access Setup ⬜
**Priority:** High  
**Estimated Time:** 1 hour

**Description:**  
Prepare application for hackathon judge evaluation.

**Acceptance Criteria:**
- [ ] Create judge user account (credentials via secure channel)
- [ ] Pre-populate sample projects for judge
- [ ] Document judge evaluation flow
- [ ] Ensure all features accessible
- [ ] Test account with quota allocation
- [ ] Alternative demo mode instructions

**Dependencies:** TASK-8.2

---

## Milestone 17: Hackathon Deliverables

### TASK-17.1: Demo Video Script ⬜
**Priority:** High  
**Estimated Time:** 2 hours

**Description:**  
Write script for 3-minute demonstration video.

**Acceptance Criteria:**
- [ ] Introduction (project name, tagline, purpose)
- [ ] Problem statement
- [ ] Solution overview
- [ ] Live demonstration:
  - Homepage showcase
  - Upload photo
  - Select style
  - Generate transformation
  - Before/after comparison
  - Save to gallery
  - Haunted mode features
- [ ] Technical highlights (AWS, Bedrock, Kiro)
- [ ] Conclusion and impact
- [ ] Under 3 minutes when spoken
- [ ] Clear, engaging narrative

**Dependencies:** All functional tasks

---

### TASK-17.2: Demo Video Recording ⬜
**Priority:** High  
**Estimated Time:** 3 hours

**Description:**  
Record and edit demonstration video.

**Acceptance Criteria:**
- [ ] Screen recording of application
- [ ] Voiceover narration
- [ ] Background music (optional, royalty-free)
- [ ] Smooth transitions
- [ ] Text overlays for key points
- [ ] High-quality export (1080p)
- [ ] Under 3 minutes duration
- [ ] Upload to YouTube/Vimeo

**Dependencies:** TASK-17.1

---

### TASK-17.3: Devpost Submission ⬜
**Priority:** High  
**Estimated Time:** 2 hours

**Description:**  
Prepare comprehensive Devpost project submission.

**Acceptance Criteria:**
- [ ] Project title and tagline
- [ ] Compelling project description
- [ ] Inspiration section
- [ ] What it does
- [ ] How we built it (emphasize Kiro usage)
- [ ] Challenges faced
- [ ] Accomplishments
- [ ] What we learned
- [ ] What's next
- [ ] Built with (technologies)
- [ ] Screenshots and images
- [ ] Demo video link
- [ ] GitHub repository link
- [ ] Try it out link (deployed app)

**Dependencies:** TASK-17.2, TASK-16.5

---

### TASK-17.4: GitHub Repository Polish ⬜
**Priority:** High  
**Estimated Time:** 2 hours

**Description:**  
Ensure GitHub repository is presentation-ready.

**Acceptance Criteria:**
- [ ] Repository name: "hoomefy"
- [ ] Clear repository description
- [ ] Topics/tags added (ai, interior-design, aws, bedrock, halloween, kiro)
- [ ] README with badges (build status, license)
- [ ] All .kiro/ files committed
- [ ] License file (MIT)
- [ ] Contributing guidelines
- [ ] Code of conduct (optional)
- [ ] Issue templates (optional)
- [ ] Clean commit history
- [ ] No sensitive data committed

**Dependencies:** TASK-16.5

---

### TASK-17.5: Kiro Development Documentation ⬜
**Priority:** High  
**Estimated Time:** 2 hours

**Description:**  
Document how Kiro was meaningfully used throughout development.

**Acceptance Criteria:**
- [ ] Document spec-driven development workflow
- [ ] Showcase .kiro/specs/ usage
- [ ] Explain steering files and their impact
- [ ] Detail agent hooks created and their value
- [ ] Examples of Kiro-assisted code generation
- [ ] Screenshots of Kiro in action
- [ ] Reflection on Kiro's contribution
- [ ] Include in main README or separate KIRO.md

**Dependencies:** All development tasks

---

## Summary

**Total Estimated Time:** ~250 hours  
**Critical Path:** 
1. Project setup (Milestone 1-2)
2. Backend infrastructure (Milestone 10)
3. Authentication (Milestone 8)
4. Image upload & Studio (Milestones 4-5)
5. Generation system (Milestones 11-13)
6. Comparison & Gallery (Milestones 6-7)
7. Haunted experience (Milestone 9)
8. Deployment & Demo (Milestones 16-17)

**Parallel Workstreams:**
- Frontend UI components (Milestones 3-7, 9)
- Backend infrastructure (Milestones 10-13)
- Testing (Milestone 15, ongoing)
- Documentation (Milestone 16, ongoing)

**Risk Mitigation:**
- Use mock AI provider throughout to avoid AWS costs
- Implement core functionality before haunted effects
- Prioritize vertical slice over breadth
- Test deployment early and often

---

**Next Action:** Begin TASK-1.1 - Project Initialization
