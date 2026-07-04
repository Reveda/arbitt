const fs = require("node:fs");
const path = require("node:path");
const {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} = require("../backend/node_modules/docx");

const outputPath = path.resolve(__dirname, "../Backend Interview Preparation.docx");

function text(content, options = {}) {
  return new TextRun({
    text: content,
    ...options,
  });
}

function paragraph(children, options = {}) {
  return new Paragraph({
    children: Array.isArray(children) ? children : [text(String(children))],
    spacing: { after: 120, line: 276 },
    ...options,
  });
}

function heading(content, level = HeadingLevel.HEADING_1) {
  return new Paragraph({
    text: content,
    heading: level,
    spacing: { before: 300, after: 160 },
  });
}

function subheading(content) {
  return heading(content, HeadingLevel.HEADING_2);
}

function bullet(content) {
  return new Paragraph({
    children: [text(content)],
    bullet: { level: 0 },
    spacing: { after: 80 },
  });
}

function answerParagraph(content) {
  return paragraph(content);
}

function qa(question, answer, level = "1-5 years") {
  const blocks = [
    paragraph([
      text(`Q. ${question}`, { bold: true }),
      text(` (${level})`, { italics: true }),
    ]),
  ];

  const answerLines = Array.isArray(answer) ? answer : [answer];
  for (const line of answerLines) {
    blocks.push(answerParagraph(line));
  }

  return blocks;
}

function addSection(children, section) {
  children.push(heading(section.title));
  if (section.intro) {
    children.push(paragraph(section.intro));
  }
  if (section.focus?.length) {
    children.push(paragraph(text("Strong points to remember:", { bold: true })));
    for (const item of section.focus) {
      children.push(bullet(item));
    }
  }
  for (const item of section.questions) {
    children.push(...qa(item.q, item.a, item.level));
  }
}

const sections = [
  {
    title: "1. Backend Stack Overview",
    intro:
      "Use this section to introduce yourself as an Express + TypeScript backend developer who understands production concerns, not only CRUD.",
    focus: [
      "Backend stack: Node.js, Express.js, TypeScript, MongoDB, Mongoose, Redis, BullMQ, JWT, bcrypt, Zod, Winston, Docker, Nginx.",
      "Architecture style: modular monolith with route, controller, service, repository, model, DTO, validation, middleware, and config layers.",
      "Production themes: security, validation, rate limiting, logging, background jobs, backups, indexes, process separation, and horizontal scaling readiness.",
    ],
    questions: [
      {
        q: "How would you explain this backend profile in an interview?",
        level: "1-2 years",
        a: [
          "I have worked on a production-style Node.js backend using Express and TypeScript. The API is modular, uses MongoDB through Mongoose, validates requests with Zod, secures routes with JWT authentication and RBAC authorization, and uses Redis for caching/rate limiting plus BullMQ for background jobs.",
          "A strong answer should mention reliability also: centralized error handling, structured logs, health checks, Docker deployment, Nginx reverse proxy, MongoDB indexes, TTL cleanup, backups, and separate worker processes.",
        ],
      },
      {
        q: "What are the main backend responsibilities in this type of system?",
        level: "1-3 years",
        a: "The backend receives HTTP requests, validates input, authenticates users, authorizes actions, executes business logic, reads/writes database records, queues heavy work, logs important events, returns consistent API responses, and protects the system from abuse through rate limits and security middleware.",
      },
      {
        q: "What makes a backend production-ready?",
        level: "3-5 years",
        a: "Production readiness means the app is secure, observable, deployable, scalable, and recoverable. Important points are environment validation, strong secrets, HTTPS, safe cookies, CORS restrictions, request limits, rate limits, DB indexes, backups, logs, health checks, graceful shutdown, separate workers, repeatable Docker deployment, and monitoring/alerting.",
      },
    ],
  },
  {
    title: "2. Node.js Fundamentals",
    intro:
      "Node.js questions are common for 1-5 year Express interviews. Focus on event loop, async I/O, runtime behavior, and production limitations.",
    focus: [
      "Node.js runs JavaScript outside the browser using the V8 engine.",
      "It is excellent for I/O-heavy APIs because it uses non-blocking asynchronous operations.",
      "CPU-heavy work should not block the event loop; move it to workers, queues, or separate services.",
    ],
    questions: [
      {
        q: "What is Node.js?",
        level: "1 year",
        a: "Node.js is a server-side JavaScript runtime built on Chrome's V8 engine. It lets us build APIs, CLIs, workers, and network applications using JavaScript or TypeScript. Its main strength is non-blocking I/O, which makes it efficient for handling many concurrent requests such as database calls, network calls, and file operations.",
      },
      {
        q: "What is the event loop in Node.js?",
        level: "1-3 years",
        a: "The event loop is the mechanism that allows Node.js to handle asynchronous operations on a single main thread. When an I/O task is started, Node does not wait synchronously. It registers callbacks/promises, continues serving other requests, and later executes the callback when the operation completes.",
      },
      {
        q: "Is Node.js single-threaded?",
        level: "1-3 years",
        a: "JavaScript execution in Node.js is mainly single-threaded, but Node internally uses libuv and a thread pool for some operations like file system, crypto, DNS, and compression. So the main event loop should stay non-blocked, while heavy or blocking work should be moved away from the request path.",
      },
      {
        q: "What are blocking and non-blocking operations?",
        level: "1-2 years",
        a: "A blocking operation stops the current thread until it finishes. A non-blocking operation starts work and allows the program to continue. In backend APIs, database queries, Redis calls, and HTTP/RPC calls should be awaited asynchronously so the server can continue handling other requests.",
      },
      {
        q: "What is the difference between process.nextTick, Promise microtasks, and setTimeout?",
        level: "3-5 years",
        a: "process.nextTick callbacks run before the event loop continues to the next phase. Promise callbacks run in the microtask queue. setTimeout callbacks run in the timers phase after the timer threshold. Too many microtasks or nextTick callbacks can starve I/O, so they must be used carefully.",
      },
      {
        q: "How do you handle uncaught errors in Node.js?",
        level: "2-5 years",
        a: "For expected request errors, use centralized Express error middleware. For startup failures, log and exit so the process manager restarts. For unhandled promise rejections or uncaught exceptions, log them, stop accepting traffic, close DB/Redis connections, and restart through PM2/Docker/orchestrator. Do not keep running in unknown corrupted state.",
      },
      {
        q: "Why is Node.js good for REST APIs?",
        level: "1-3 years",
        a: "REST APIs are usually I/O-bound: they spend time waiting for databases, caches, external APIs, and network calls. Node's asynchronous non-blocking model handles this efficiently with less thread overhead compared to a one-thread-per-request model.",
      },
      {
        q: "When is Node.js not the best choice?",
        level: "3-5 years",
        a: "Node.js is not ideal for long CPU-heavy calculations on the request thread, such as heavy image/video processing, complex ML inference, or large synchronous cryptographic work. These should be moved to worker threads, background queues, specialized services, or languages better suited for CPU-heavy workloads.",
      },
    ],
  },
  {
    title: "3. Express.js Architecture",
    intro:
      "Express interview answers should explain request lifecycle, middleware order, routing, and layered architecture.",
    focus: [
      "Express app bootstraps security middleware first, then parsing/logging/activity tracking, then routes, then not-found and error handlers.",
      "Routes stay thin; controllers parse request/response; services hold business logic; repositories isolate database access.",
      "The app disables x-powered-by, uses trust proxy behind Nginx, and sets body-size limits.",
    ],
    questions: [
      {
        q: "What is Express.js?",
        level: "1 year",
        a: "Express.js is a minimal Node.js web framework used to build HTTP APIs and web servers. It provides routing, middleware support, request/response helpers, and a flexible structure for building REST APIs.",
      },
      {
        q: "Explain Express middleware.",
        level: "1-2 years",
        a: "Middleware is a function that runs during the request-response cycle. It receives req, res, and next. It can authenticate, validate, parse body, apply CORS, log requests, rate limit, or terminate the response. Middleware order matters because each middleware sees the request in the order it was registered.",
      },
      {
        q: "What is the typical request lifecycle in this backend style?",
        level: "2-4 years",
        a: "A request reaches Nginx, then Express. Express applies Helmet, CORS, compression, cookie parser, JSON/urlencoded body parsers, request logging, API activity tracking, general rate limit, module routes, route-level auth/validation, controller, service, repository/database, then returns a standard API response. If no route matches, notFound runs; if an error occurs, centralized error middleware responds.",
      },
      {
        q: "Why separate routes, controllers, services, repositories, and models?",
        level: "2-5 years",
        a: "Separation keeps code maintainable and testable. Routes define endpoints and middleware. Controllers handle HTTP-specific logic. Services contain business rules. Repositories encapsulate database queries. Models define schema and indexes. This avoids fat controllers and makes business logic reusable outside HTTP, such as in jobs or scripts.",
      },
      {
        q: "What is centralized error handling in Express?",
        level: "1-3 years",
        a: "Centralized error handling means all thrown or forwarded errors are processed by one error middleware. Known ApiError objects return their status and message, while unknown errors are logged and return a generic 500 message. This prevents leaking stack traces and keeps API responses consistent.",
      },
      {
        q: "Why use catchAsync around controllers?",
        level: "1-3 years",
        a: "Async controllers return promises. If a promise rejects, Express 4 does not always catch it automatically. A catchAsync wrapper catches rejected promises and passes them to next(error), allowing centralized error middleware to handle them.",
      },
      {
        q: "Why set app.set('trust proxy', 1) behind Nginx?",
        level: "3-5 years",
        a: "When Express is behind a reverse proxy, the actual client IP and protocol are available through forwarded headers. trust proxy tells Express to trust the first proxy so req.ip, secure cookies, and rate limiting can work correctly. It must be configured carefully to avoid trusting forged headers from the public internet.",
      },
      {
        q: "Why disable x-powered-by?",
        level: "1-3 years",
        a: "The x-powered-by header exposes that the server uses Express. Removing it slightly reduces fingerprinting. It is not a complete security solution, but it is a simple hardening step.",
      },
    ],
  },
  {
    title: "4. TypeScript For Backend",
    intro:
      "For Express TypeScript interviews, show that you know typing, DTOs, z.infer, safe unknown handling, and build-time checks.",
    focus: [
      "TypeScript helps catch bugs before runtime and improves API contracts.",
      "DTOs define the shape of API responses; Zod schemas define runtime request validation.",
      "Use unknown for unsafe data and narrow it instead of using any everywhere.",
    ],
    questions: [
      {
        q: "Why use TypeScript in Node.js backend?",
        level: "1 year",
        a: "TypeScript adds static typing to JavaScript. It catches many mistakes during development, improves auto-completion, documents contracts, and makes refactoring safer. In backend code it is useful for DTOs, service inputs, repository outputs, JWT payloads, environment variables, and request validation types.",
      },
      {
        q: "What is the difference between type and interface?",
        level: "1-3 years",
        a: "Both describe shapes. interface is commonly used for object contracts and can be extended/merged. type is more flexible for unions, intersections, mapped types, primitives, tuples, and utility types. In backend code either can be used, but consistency matters.",
      },
      {
        q: "What is z.infer and why is it useful?",
        level: "2-4 years",
        a: "z.infer creates a TypeScript type from a Zod schema. This avoids defining the same request shape twice. The runtime schema validates actual input, and the inferred type gives compile-time safety in services/controllers.",
      },
      {
        q: "Why prefer unknown over any?",
        level: "2-5 years",
        a: "any disables type checking and can hide bugs. unknown is safer because you must narrow it before using it. For external data like RPC responses, JSON payloads, or caught errors, unknown forces explicit checks before accessing fields.",
      },
      {
        q: "What are DTOs?",
        level: "1-3 years",
        a: "DTO means Data Transfer Object. It defines what data is sent to or from an API. DTOs prevent exposing internal database fields like passwordHash, OTP hashes, token hashes, or admin-only metadata.",
      },
      {
        q: "How do you type Express Request with authenticated user data?",
        level: "2-4 years",
        a: "You can use declaration merging to extend Express.Request and add a user property containing fields like id and role. Authentication middleware sets req.user after verifying JWT. Later middleware and controllers can safely read req.user.",
      },
      {
        q: "What does a TypeScript build step do in backend?",
        level: "1-3 years",
        a: "The build step compiles TypeScript source files into JavaScript in a dist directory. It catches type errors and produces code that Node can run in production.",
      },
    ],
  },
  {
    title: "5. REST API Design",
    intro:
      "Interviewers often test status codes, idempotency, pagination, validation, API versioning, and response consistency.",
    focus: [
      "The API uses a versioned prefix such as /api/v1.",
      "Responses use a consistent envelope with statusCode, success, message, and data or error message.",
      "Financial actions must be idempotent and duplicate-protected.",
    ],
    questions: [
      {
        q: "What is REST?",
        level: "1 year",
        a: "REST is an architectural style for designing APIs around resources. It uses HTTP methods like GET, POST, PATCH, PUT, and DELETE, status codes, stateless requests, and resource-oriented URLs.",
      },
      {
        q: "Explain common HTTP methods.",
        level: "1 year",
        a: "GET reads data, POST creates or triggers an action, PUT replaces a resource, PATCH partially updates a resource, and DELETE removes a resource. GET should be safe and should not change server state.",
      },
      {
        q: "What is the difference between 401 and 403?",
        level: "1-3 years",
        a: "401 Unauthorized means the user is not authenticated or the token is invalid. 403 Forbidden means the user is authenticated but does not have permission for that resource/action.",
      },
      {
        q: "Why use /api/v1?",
        level: "1-3 years",
        a: "API versioning allows future breaking changes without immediately breaking old clients. New versions like /api/v2 can coexist while old clients migrate.",
      },
      {
        q: "What is pagination and why is it needed?",
        level: "1-3 years",
        a: "Pagination returns data in pages instead of returning huge lists. It reduces memory, database load, network cost, and response time. Common response metadata includes page, limit, total, totalPages, hasNextPage, and hasPreviousPage.",
      },
      {
        q: "What is idempotency and why is it important for payment/financial APIs?",
        level: "3-5 years",
        a: "Idempotency means repeating the same request should not create duplicate side effects. For financial APIs, duplicate transaction hashes, queue jobs, or payout generations can cause money-related bugs. Unique indexes, jobId, status checks, and transaction-like atomic updates help enforce idempotency.",
      },
      {
        q: "How should APIs handle invalid input?",
        level: "1-3 years",
        a: "APIs should validate body, params, and query before business logic. If invalid, return 400 with a clear message. This backend style uses Zod schemas and a validateRequest middleware.",
      },
      {
        q: "How would you design a consistent API response?",
        level: "1-3 years",
        a: "A success response can include statusCode, success true, message, and data. An error response can include statusCode, success false, and message. Consistent responses simplify frontend handling and debugging.",
      },
    ],
  },
  {
    title: "6. Authentication",
    intro:
      "Authentication proves who the user is. In this backend style, it uses bcrypt password hashing, JWT access tokens, refresh tokens, sessions, cookies, OTP, and audit events.",
    focus: [
      "Access token is short-lived; refresh token is long-lived and session-backed.",
      "Refresh tokens are hashed in database and rotated to detect reuse.",
      "Cookies are HTTP-only, secure in production, and configured with SameSite.",
    ],
    questions: [
      {
        q: "What is authentication?",
        level: "1 year",
        a: "Authentication is the process of verifying the identity of a user. Example: a user logs in with email and password, the backend verifies the password hash, then issues tokens or a session.",
      },
      {
        q: "How does password hashing work with bcrypt?",
        level: "1-3 years",
        a: "bcrypt hashes the password with a salt and multiple rounds. The backend stores only the hash, not the plain password. During login, bcrypt compares the submitted password with the stored hash. A cost factor like 12 slows brute-force attacks while remaining practical for login performance.",
      },
      {
        q: "What is JWT?",
        level: "1-3 years",
        a: "JWT, or JSON Web Token, is a signed token containing claims like user id, role, token type, and expiry. The server verifies the signature using a secret. JWT is stateless for access checks, but refresh tokens should usually be tracked in a database for revocation and rotation.",
      },
      {
        q: "Why use access token and refresh token separately?",
        level: "2-4 years",
        a: "Access tokens are short-lived and used to call APIs. Refresh tokens are longer-lived and used only to obtain new access tokens. This limits damage if an access token leaks. Refresh sessions can be revoked from the database.",
      },
      {
        q: "What is refresh token rotation?",
        level: "3-5 years",
        a: "Refresh token rotation issues a new refresh token every time the refresh endpoint is used. The previous token is invalidated or kept briefly for concurrency grace. If an old token is reused outside the grace window, the system treats it as token theft and revokes the session.",
      },
      {
        q: "Why store refresh token hash instead of the token?",
        level: "2-5 years",
        a: "If the database leaks, raw refresh tokens would allow attackers to create sessions. Storing SHA-256 hashes means the backend can compare incoming tokens by hash but does not store usable raw tokens.",
      },
      {
        q: "Why use HTTP-only cookies for auth tokens?",
        level: "2-4 years",
        a: "HTTP-only cookies cannot be read by JavaScript, which reduces token theft through XSS. Secure cookies are sent only over HTTPS. SameSite helps reduce CSRF risk by controlling cross-site cookie sending.",
      },
      {
        q: "What is the risk of storing JWT in localStorage?",
        level: "2-4 years",
        a: "localStorage is accessible to JavaScript. If an XSS vulnerability exists, an attacker can read and exfiltrate tokens. HTTP-only cookies reduce this risk, though CSRF protection and SameSite settings must be considered.",
      },
      {
        q: "How does OTP verification usually work?",
        level: "1-3 years",
        a: "The backend generates a random OTP, hashes it with purpose and email, stores hash plus expiry and attempt count, sends OTP through email/SMS, and verifies submitted OTP by hashing the input and comparing it. OTP must expire quickly and have attempt limits.",
      },
      {
        q: "Why should forgot password return a generic accepted response?",
        level: "2-4 years",
        a: "If the API says 'email not found', attackers can enumerate registered emails. Returning accepted true for both existing and non-existing emails prevents user enumeration.",
      },
      {
        q: "What is a transaction password and why can it be separate from login password?",
        level: "2-4 years",
        a: "A transaction password is an extra credential required for sensitive financial actions like withdrawal. It adds a second barrier even if a login session is compromised. It should be hashed and never stored in plain text.",
      },
    ],
  },
  {
    title: "7. Authorization And RBAC",
    intro:
      "Authorization decides what an authenticated user can do. This backend style uses roles plus fine-grained permissions.",
    focus: [
      "Roles include user, admin, and super_admin.",
      "Permissions are action strings such as wallet:read, plans:purchase, admin:users:manage, and super_admin:security:manage.",
      "Authorization middleware checks authentication first, then role, then active role permissions.",
    ],
    questions: [
      {
        q: "What is authorization?",
        level: "1 year",
        a: "Authorization is the process of checking whether an authenticated user has permission to perform an action. Authentication answers 'who are you?' while authorization answers 'what are you allowed to do?'",
      },
      {
        q: "What is RBAC?",
        level: "1-3 years",
        a: "RBAC means Role-Based Access Control. Users are assigned roles, and roles have permissions. Instead of checking user IDs everywhere, routes check roles or permissions like admin:users:manage.",
      },
      {
        q: "What is the difference between role checks and permission checks?",
        level: "2-4 years",
        a: "Role checks are broad, for example only admin or super_admin can access admin routes. Permission checks are fine-grained, for example a role must have admin:withdrawals:review to approve withdrawals. Combining both is more flexible and safer.",
      },
      {
        q: "How should ownership checks work?",
        level: "2-5 years",
        a: "Even if a user is authenticated, they should only access their own resources unless they have admin permission. Queries should include userId from req.user, not userId from the client body. This prevents horizontal privilege escalation.",
      },
      {
        q: "Why load permissions from active role records?",
        level: "3-5 years",
        a: "Loading active role permissions from the database allows permissions to be centrally managed. If a role is disabled or permissions change, the route can enforce the updated policy without relying only on old JWT claims.",
      },
      {
        q: "How would you explain 401 vs 403 in RBAC?",
        level: "1-3 years",
        a: "401 means no valid authentication token. 403 means the token is valid but the user does not have the required role or permission, or the account is suspended.",
      },
    ],
  },
  {
    title: "8. Validation, DTOs, And Error Handling",
    intro:
      "Validation and error handling are must-have topics for Express TypeScript interviews.",
    focus: [
      "Zod validates body, params, and query at runtime.",
      "DTOs keep API outputs safe and predictable.",
      "ApiError plus centralized error middleware keeps errors consistent.",
    ],
    questions: [
      {
        q: "Why is runtime validation needed if TypeScript already exists?",
        level: "1-3 years",
        a: "TypeScript checks code at compile time, but API input comes from external clients at runtime. A malicious or buggy client can send anything. Runtime validation with Zod ensures incoming data is actually safe before business logic runs.",
      },
      {
        q: "What types of request data should be validated?",
        level: "1-2 years",
        a: "Request body, route params, query parameters, headers when important, and file metadata if uploads exist. Examples include ObjectId format, email format, wallet address format, amount limits, pagination limits, date ranges, and transaction hash regex.",
      },
      {
        q: "What is input sanitization?",
        level: "2-4 years",
        a: "Input sanitization normalizes or cleans input, such as trimming strings, lowercasing emails, limiting length, and rejecting unexpected fields. Validation checks correctness; sanitization prepares safe normalized values.",
      },
      {
        q: "How does centralized error handling improve security?",
        level: "2-4 years",
        a: "It prevents leaking internal stack traces, database errors, secrets, or implementation details. Unknown errors are logged internally but clients receive a generic message. Known operational errors return controlled status codes and messages.",
      },
      {
        q: "What is an operational error?",
        level: "2-4 years",
        a: "An operational error is expected at runtime, such as invalid credentials, insufficient balance, not found, validation failure, or forbidden action. These can be returned safely with proper HTTP status codes.",
      },
      {
        q: "Why avoid exposing passwordHash or OTP fields in API responses?",
        level: "1-3 years",
        a: "Sensitive fields can be used for attacks if leaked. Mongoose select:false and safe DTO mapping help ensure password hashes, token hashes, OTP hashes, and internal secrets are not accidentally sent to clients.",
      },
    ],
  },
  {
    title: "9. Rate Limiting And Abuse Prevention",
    intro:
      "This replaces the old unnecessary point 9. Rate limiting is a core security topic and directly relevant for production backend interviews.",
    focus: [
      "General API limiter protects all API routes except health.",
      "Auth IP limiter and auth identifier limiter protect login/register from brute force.",
      "OTP IP and OTP identifier limiters protect OTP endpoints.",
      "Refresh token limiter protects session refresh abuse.",
      "Financial action limiter protects deposits, withdrawals, admin reviews, and sensitive money actions.",
      "Redis-backed limiter supports multi-instance scaling; memory fallback keeps app usable if Redis is unavailable.",
    ],
    questions: [
      {
        q: "What is rate limiting?",
        level: "1 year",
        a: "Rate limiting controls how many requests a client can make within a time window. It protects APIs from brute-force attacks, scraping, accidental loops, and traffic spikes.",
      },
      {
        q: "What rate limit types should a production API have?",
        level: "2-4 years",
        a: "A production API should have a general API limit, stricter auth limits, identifier-based limits for email/username, OTP request limits, refresh-token limits, and financial/sensitive-action limits. Admin actions may also need stricter limits and audit logging.",
      },
      {
        q: "Why use both IP-based and identifier-based limits for login?",
        level: "3-5 years",
        a: "IP limits stop one IP from making too many attempts. Identifier limits stop distributed attacks against one account from many IPs. Together they protect both infrastructure and individual users.",
      },
      {
        q: "Why skip successful requests for some auth limiters?",
        level: "2-4 years",
        a: "skipSuccessfulRequests lets legitimate users who type correct credentials avoid being punished, while failed attempts still count. It is useful for login/register brute-force protection, but not always suitable for OTP sending or financial actions.",
      },
      {
        q: "How does Redis-based rate limiting work here conceptually?",
        level: "3-5 years",
        a: "Each request generates a key such as prefix:limiter:scope:client. Redis increments the key using INCR and sets expiry using EXPIRE NX for the window. If hits exceed the limit, the request is rejected with 429. Because Redis is shared, limits work across multiple API containers.",
      },
      {
        q: "Why is memory-store rate limiting not enough for scaled production?",
        level: "3-5 years",
        a: "Memory store is per process. If there are multiple Node processes or containers, each has its own counter, so users can bypass limits by hitting different instances. Redis centralizes counters across all instances.",
      },
      {
        q: "Explain fixed window, sliding window, token bucket, and leaky bucket.",
        level: "3-5 years",
        a: [
          "Fixed window counts requests in a fixed time period, simple but can allow bursts at boundaries.",
          "Sliding window considers a rolling time range and is smoother but more expensive.",
          "Token bucket refills tokens over time and allows controlled bursts.",
          "Leaky bucket processes requests at a steady rate and smooths traffic. Express-rate-limit style implementations are often fixed-window-like.",
        ],
      },
      {
        q: "Why use standard RateLimit headers?",
        level: "2-4 years",
        a: "RateLimit headers tell clients how many requests are allowed, remaining, and when the limit resets. This helps frontend and API consumers back off correctly instead of blindly retrying.",
      },
      {
        q: "What should happen if Redis rate limiter fails?",
        level: "3-5 years",
        a: "There are two strategies: fail closed for maximum security or fail open/fallback for availability. This backend uses a memory fallback to keep service available, but for very sensitive endpoints some teams may prefer fail closed.",
      },
    ],
  },
  {
    title: "10. MongoDB And Mongoose",
    intro:
      "MongoDB interviews for 1-5 years should cover schemas, indexes, atomic updates, aggregation, TTL, and production index strategy.",
    focus: [
      "Mongoose schemas define fields, enums, defaults, references, timestamps, select:false, and indexes.",
      "Production disables autoIndex and uses an explicit index sync script.",
      "Advanced indexes include compound indexes, unique indexes, sparse indexes, partial unique indexes, and TTL indexes.",
      "Important models include User, AuthSession, Wallet, Transaction, PaymentIntent, Role, AuditLog, ApiActivity, Plan, Referral, Notification, and SupportTicket.",
    ],
    questions: [
      {
        q: "What is MongoDB?",
        level: "1 year",
        a: "MongoDB is a NoSQL document database that stores data as BSON documents. It is flexible for evolving application data and works well with JSON-like objects used in Node.js APIs.",
      },
      {
        q: "What is Mongoose?",
        level: "1 year",
        a: "Mongoose is an ODM for MongoDB. It provides schemas, models, validation, middleware, type casting, indexes, and query helpers for Node.js applications.",
      },
      {
        q: "What is a schema in Mongoose?",
        level: "1-2 years",
        a: "A schema defines the structure of documents: fields, types, required rules, defaults, enums, indexes, references, timestamps, and field-level options like select:false.",
      },
      {
        q: "What is the difference between MongoDB document and SQL row?",
        level: "1-3 years",
        a: "A SQL row belongs to a table with a fixed schema. A MongoDB document is a JSON-like object in a collection and can contain nested fields and arrays. MongoDB is more flexible, but good schema discipline is still important.",
      },
      {
        q: "What are indexes and why are they important?",
        level: "1-3 years",
        a: "Indexes are data structures that speed up reads by allowing MongoDB to find documents without scanning the whole collection. They are important for filters, sorting, uniqueness, and TTL cleanup. But too many indexes slow writes and consume storage.",
      },
      {
        q: "Explain compound indexes.",
        level: "2-4 years",
        a: "A compound index includes multiple fields in order, such as userId + createdAt or status + type + createdAt. It supports queries that filter and sort by those fields. Field order matters: equality fields usually come first, then sort/range fields.",
      },
      {
        q: "Explain unique indexes.",
        level: "1-3 years",
        a: "A unique index enforces uniqueness at the database level. Examples include unique email, username, referralCode, wallet userId, or transaction hash. It prevents race-condition duplicates that application-only checks might miss.",
      },
      {
        q: "What is a sparse index?",
        level: "2-4 years",
        a: "A sparse index only includes documents where the indexed field exists. It is useful for optional unique fields like username or referralCode, where many documents may not have the field.",
      },
      {
        q: "What is a partial index?",
        level: "3-5 years",
        a: "A partial index indexes only documents matching a filter. For example, a unique reward index can apply only where payoutKind is weekly and type is reward. This enforces uniqueness only for a specific subset.",
      },
      {
        q: "What is a TTL index?",
        level: "2-4 years",
        a: "TTL index automatically deletes documents after a configured time based on a date field. It is useful for logs, activity tracking, sessions, OTP records, or temporary data. MongoDB TTL deletion is not instant; a background monitor deletes expired records periodically.",
      },
      {
        q: "Why disable autoIndex in production?",
        level: "3-5 years",
        a: "Building indexes automatically during app startup can slow or block production startup and affect DB performance. Better practice is autoIndex false in production and running a controlled index sync/migration command during deployment.",
      },
      {
        q: "What is syncIndexes?",
        level: "3-5 years",
        a: "syncIndexes compares Mongoose model indexes with actual MongoDB indexes and creates/drops indexes to match. It should be used carefully in production because dropping indexes can affect performance. Prefer controlled deployment windows and backups.",
      },
      {
        q: "What is select:false in Mongoose?",
        level: "1-3 years",
        a: "select:false prevents sensitive fields from being returned by default in queries. Examples include passwordHash, transactionPasswordHash, OTP hashes, refreshTokenHash, and previousRefreshTokenHash.",
      },
      {
        q: "What is lean() in Mongoose?",
        level: "2-4 years",
        a: "lean() returns plain JavaScript objects instead of full Mongoose documents. It is faster and uses less memory for read-only queries, but you lose document methods, getters, setters, and save().",
      },
      {
        q: "What are ObjectId references?",
        level: "1-3 years",
        a: "ObjectId references connect documents across collections, such as Transaction.userId referencing User or Wallet.userId referencing User. MongoDB does not enforce joins like SQL by default, but Mongoose can populate references if needed.",
      },
      {
        q: "How do you prevent duplicate financial records?",
        level: "3-5 years",
        a: "Use database-level unique constraints and idempotent business logic. For example, unique transaction hashes, unique payment intent hash + log index, unique reward payout indexes, and checking existing records before creation protect against duplicate processing.",
      },
      {
        q: "How do atomic updates help wallet balances?",
        level: "3-5 years",
        a: "Atomic updates allow a balance change and condition check in one DB operation, such as decrementing available balance only if availableUsdt is enough. This reduces race conditions when multiple requests try to withdraw simultaneously.",
      },
      {
        q: "What is aggregation in MongoDB?",
        level: "2-5 years",
        a: "Aggregation is a pipeline for processing data with stages like $match, $group, $sort, $lookup, $project, and $facet. It is used for reports, dashboards, totals, grouped earnings, wallet summaries, and admin analytics.",
      },
      {
        q: "What are skip-limit pagination issues?",
        level: "3-5 years",
        a: "skip-limit is simple but becomes slow for deep pages because MongoDB still scans skipped documents. Cursor-based pagination using indexed fields like createdAt and _id is better for very large collections.",
      },
      {
        q: "When should you embed vs reference in MongoDB?",
        level: "3-5 years",
        a: "Embed data that is small, read together, and has lifecycle ownership. Reference data that is large, reused, frequently updated independently, or can grow unbounded. For example, user profile can be embedded, while transactions should be separate documents.",
      },
    ],
  },
  {
    title: "11. Redis And Caching",
    intro:
      "Redis is used for shared cache, distributed rate limiting, and BullMQ storage/coordination. Know how it behaves in production.",
    focus: [
      "Redis is optional for local development but important for production scaling.",
      "Cache keys use a prefix and hashed request parts.",
      "Redis failures are logged and the API continues without cache when possible.",
      "Redis URL can contain username/password when Redis ACL or requirepass is configured.",
    ],
    questions: [
      {
        q: "What is Redis?",
        level: "1 year",
        a: "Redis is an in-memory data store commonly used for caching, counters, rate limiting, sessions, pub/sub, locks, and queues. It is very fast because data is kept in memory.",
      },
      {
        q: "How is Redis useful in this backend style?",
        level: "1-3 years",
        a: "Redis supports response caching, shared rate limiter counters, and BullMQ queues. It helps multiple API containers share the same cache/limits instead of each process keeping isolated memory state.",
      },
      {
        q: "How does response caching work conceptually?",
        level: "2-4 years",
        a: "For eligible GET requests, a cache key is created from namespace, method, URL, and scope. If Redis has a cached response, the API returns it with X-Cache HIT. Otherwise, it lets the controller run, stores the JSON response with TTL, and returns X-Cache MISS.",
      },
      {
        q: "What is TTL in Redis?",
        level: "1-3 years",
        a: "TTL means time to live. A key expires automatically after the configured seconds. It prevents stale cache from staying forever and controls memory growth.",
      },
      {
        q: "Why use cache key prefix?",
        level: "2-4 years",
        a: "A prefix separates environments or applications sharing the same Redis instance. For example, arbitrum:plans:list:hash avoids collisions with other apps or staging keys.",
      },
      {
        q: "What is cache invalidation?",
        level: "2-5 years",
        a: "Cache invalidation is removing or updating cached data when underlying data changes. It is hard because stale cache can show old data. Strategies include short TTLs, explicit delete on updates, versioned keys, event-based invalidation, or write-through caching.",
      },
      {
        q: "What is cache stampede?",
        level: "3-5 years",
        a: "Cache stampede happens when many requests miss an expired cache key at once and all hit the database. Solutions include locks, request coalescing, stale-while-revalidate, jittered TTL, and pre-warming popular keys.",
      },
      {
        q: "Should Redis be protected with username/password?",
        level: "2-5 years",
        a: "Yes in production. Redis should not be publicly exposed. Use Docker internal network or private network, require a strong password/ACL, and configure REDIS_URL like redis://:password@redis:6379 or redis://username:password@host:6379 when ACL users are used.",
      },
      {
        q: "What happens if Redis is down?",
        level: "3-5 years",
        a: "For cache and rate limiter fallback, the API can continue with degraded performance or local memory counters. For BullMQ queues, background jobs cannot be reliably enqueued/processed until Redis is available. Health checks and alerts should detect this quickly.",
      },
    ],
  },
  {
    title: "12. BullMQ And Background Workers",
    intro:
      "BullMQ questions test queues, retries, workers, idempotency, concurrency, and Redis dependency.",
    focus: [
      "BullMQ uses Redis to store jobs, states, retries, delays, and worker coordination.",
      "The API process adds withdrawal jobs; the worker process consumes them.",
      "Attempts, exponential backoff, jobId duplicate prevention, and concurrency control are important production concepts.",
    ],
    questions: [
      {
        q: "What is BullMQ?",
        level: "1-3 years",
        a: "BullMQ is a Node.js job queue library built on Redis. It allows APIs to enqueue background jobs and workers to process them asynchronously with retries, delays, priorities, and job state tracking.",
      },
      {
        q: "Why use a queue instead of doing everything inside the API request?",
        level: "2-4 years",
        a: "Queues move slow, unreliable, or retryable work outside the request-response path. This keeps APIs fast and avoids timeouts. Examples include withdrawals, emails, payouts, reports, notifications, and webhook processing.",
      },
      {
        q: "What is the difference between Queue and Worker in BullMQ?",
        level: "1-3 years",
        a: "Queue is used to add jobs. Worker listens to the queue and processes jobs. The API should usually add jobs, while separate worker processes handle execution.",
      },
      {
        q: "Why run worker as a separate process?",
        level: "2-5 years",
        a: "Worker separation prevents heavy/background tasks from blocking API traffic. It also allows scaling APIs and workers independently. In this setup PROCESS_ROLE can be api, worker, or all, so production can run separate backend and worker containers.",
      },
      {
        q: "What are attempts and backoff?",
        level: "2-4 years",
        a: "Attempts define how many times a failed job should retry. Backoff defines delay before retry. Exponential backoff increases delay after each failure, reducing pressure on external services during outages.",
      },
      {
        q: "Why use jobId for duplicate prevention?",
        level: "3-5 years",
        a: "If the same withdrawal is enqueued twice, using withdrawalId as jobId prevents duplicate jobs for the same action. This is important for financial idempotency.",
      },
      {
        q: "Why set withdrawal worker concurrency to 1?",
        level: "3-5 years",
        a: "On-chain withdrawals from the same wallet can have nonce ordering issues if multiple transactions are sent concurrently. Concurrency 1 processes one withdrawal at a time and reduces nonce collision and double-spend style operational mistakes.",
      },
      {
        q: "What should happen when a job fails all retries?",
        level: "3-5 years",
        a: "It should be logged, kept for investigation, and moved to manual review or a dead-letter flow. For sensitive actions, never silently drop failed jobs. Operators should be able to retry or resolve them manually.",
      },
      {
        q: "Can BullMQ work without Redis?",
        level: "1-3 years",
        a: "No. BullMQ uses Redis as its backing store. If Redis is disabled or unavailable, queue-based processing cannot work reliably. The application can choose a synchronous/manual fallback for some workflows, but BullMQ itself needs Redis.",
      },
    ],
  },
  {
    title: "13. Security Hardening",
    intro:
      "Security is one of the strongest areas for interviews. Give concrete layers instead of saying only 'we use JWT'.",
    focus: [
      "Helmet security headers, CORS allowlist, body size limits, x-powered-by disabled, cookie security, rate limits, validation, audit logs, and secrets validation.",
      "Production rejects weak default JWT secrets and requires wallet encryption key.",
      "Financial endpoints use extra rate limiting, duplicate prevention, and transaction password for withdrawals.",
    ],
    questions: [
      {
        q: "What is Helmet in Express?",
        level: "1-3 years",
        a: "Helmet sets security-related HTTP headers such as Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and others. These headers reduce common browser-based attacks.",
      },
      {
        q: "What is CORS and why is it important?",
        level: "1-3 years",
        a: "CORS controls which browser origins can call the API. In production, only trusted frontend domains should be allowed. credentials:true allows cookies but must be paired with a strict origin allowlist.",
      },
      {
        q: "What is CSRF?",
        level: "2-5 years",
        a: "CSRF tricks a logged-in browser into sending unwanted requests using cookies. SameSite cookies reduce CSRF risk. For highly sensitive cookie-based APIs, use CSRF tokens or require custom headers plus strict CORS.",
      },
      {
        q: "What is XSS and how do auth cookies help?",
        level: "2-4 years",
        a: "XSS lets attacker JavaScript run in a user's browser. HTTP-only cookies cannot be read by JavaScript, reducing token theft. Still, XSS can perform actions as the user, so CSP, input sanitization, and frontend escaping remain important.",
      },
      {
        q: "What is NoSQL injection?",
        level: "2-5 years",
        a: "NoSQL injection happens when user input is treated as MongoDB query operators, such as passing {$ne:null}. Validation, strict schemas, allowlisted fields, and avoiding direct use of raw request bodies in queries reduce this risk.",
      },
      {
        q: "Why limit JSON body size?",
        level: "1-3 years",
        a: "Large request bodies can consume memory and CPU, causing denial of service. A limit like 1mb protects the API unless larger uploads are intentionally required.",
      },
      {
        q: "How should secrets be managed?",
        level: "2-5 years",
        a: "Secrets should be stored in environment variables or a secrets manager, not committed to Git. They should be strong, rotated when leaked, different per environment, and validated on startup. Examples include JWT secrets, Redis password, Mongo password, encryption keys, and private keys.",
      },
      {
        q: "Why validate environment variables with Zod?",
        level: "2-4 years",
        a: "It fails fast if required configuration is missing or invalid. This prevents starting production with weak default secrets, wrong URLs, bad ports, invalid durations, or missing encryption keys.",
      },
      {
        q: "How do you secure admin routes?",
        level: "2-5 years",
        a: "Require authentication, admin/super_admin roles, fine-grained permissions, financial action rate limits where needed, validation, audit logs, strong passwords, secure cookies, HTTPS, and possibly IP allowlisting or MFA for sensitive panels.",
      },
      {
        q: "What security checks are important for withdrawal APIs?",
        level: "3-5 years",
        a: "Check authenticated user, role/permission, transaction password, valid wallet address, amount limits, available balance atomically, rate limit, duplicate job protection, audit logs, and manual review fallback if auto-processing fails.",
      },
      {
        q: "What is dependency auditing?",
        level: "1-3 years",
        a: "Dependency auditing checks packages for known vulnerabilities. In Node.js, npm audit can detect vulnerable dependencies. Production builds should avoid shipping unnecessary dev dependencies and should update dependencies regularly.",
      },
      {
        q: "What is audit logging?",
        level: "2-5 years",
        a: "Audit logging records important security and business events: login, failed login, password reset, admin updates, payouts, withdrawals, and permission-sensitive changes. It supports debugging, compliance, and incident investigation.",
      },
    ],
  },
  {
    title: "14. Logging, Monitoring, And Observability",
    intro:
      "Good backend developers can explain how they debug production without console.log everywhere.",
    focus: [
      "Winston handles application logs; Morgan logs HTTP requests.",
      "Production logs are JSON-friendly and can be written to app.log and error.log.",
      "API activity tracking stores route group, action, status code, duration, IP, user role, and user id with TTL retention.",
    ],
    questions: [
      {
        q: "What is logging?",
        level: "1 year",
        a: "Logging records events from the application, such as startup, requests, warnings, errors, auth events, queue jobs, and database connection status. Logs help diagnose production issues.",
      },
      {
        q: "Why use Winston instead of console.log?",
        level: "1-3 years",
        a: "Winston supports log levels, JSON formatting, multiple transports, file output, error stacks, and production-friendly logging. console.log is simple but not enough for structured production logs.",
      },
      {
        q: "What are log levels?",
        level: "1-3 years",
        a: "Log levels categorize importance: debug for development details, info for normal events, warn for recoverable problems, error for failures, and fatal for startup or unrecoverable issues.",
      },
      {
        q: "Why avoid logging secrets?",
        level: "1-3 years",
        a: "Logs are often shared with teams and external systems. If secrets, tokens, passwords, private keys, or OTPs are logged in production, attackers can use them. Development-only logs must be disabled in production.",
      },
      {
        q: "What is a health check endpoint?",
        level: "1-3 years",
        a: "A health endpoint returns whether the API is running and can include dependency statuses like MongoDB and Redis. Load balancers and monitoring systems use it to detect unhealthy instances.",
      },
      {
        q: "What metrics would you monitor in production?",
        level: "3-5 years",
        a: "Monitor request rate, error rate, latency percentiles, CPU, memory, disk, MongoDB connections/query time, Redis availability, queue depth, job failures, login failures, rate limit hits, and backup success.",
      },
      {
        q: "What is the difference between logs, metrics, and traces?",
        level: "3-5 years",
        a: "Logs are event records, metrics are numerical time-series measurements, and traces show the path/timing of a request across components. All three together provide observability.",
      },
    ],
  },
  {
    title: "15. Docker, Nginx, PM2, And Deployment",
    intro:
      "Deployment questions separate junior from production-aware backend developers.",
    focus: [
      "Docker Compose can run backend API, worker, MongoDB, Redis, backup service, and frontend/Nginx.",
      "Nginx acts as reverse proxy and can load balance multiple backend containers.",
      "PM2 can run Node in cluster mode for API and a separate worker process.",
    ],
    questions: [
      {
        q: "What is Docker?",
        level: "1 year",
        a: "Docker packages an application with its runtime dependencies into containers. It makes deployment repeatable across local, staging, and production environments.",
      },
      {
        q: "What is Docker Compose?",
        level: "1-3 years",
        a: "Docker Compose defines multiple services in one YAML file, such as backend, frontend, MongoDB, Redis, and worker. It manages networking, volumes, environment variables, and service startup.",
      },
      {
        q: "Why run API and worker as separate containers?",
        level: "2-5 years",
        a: "API handles HTTP traffic and should stay responsive. Worker handles background jobs and can be scaled or restarted separately. Separation prevents queue work from affecting API latency.",
      },
      {
        q: "What is Nginx used for?",
        level: "1-3 years",
        a: "Nginx can serve static frontend files, reverse proxy API requests to backend containers, add headers, limit body size, terminate SSL, and load balance multiple backend instances.",
      },
      {
        q: "What is load balancing?",
        level: "2-4 years",
        a: "Load balancing distributes traffic across multiple backend instances. Algorithms include round-robin, least connections, IP hash, and weighted balancing. Nginx upstream with least_conn sends traffic to the instance with fewer active connections.",
      },
      {
        q: "What is PM2?",
        level: "1-3 years",
        a: "PM2 is a Node.js process manager. It can restart crashed apps, run cluster mode, manage environment variables, show logs, and keep apps alive on a VPS.",
      },
      {
        q: "What is cluster mode in PM2?",
        level: "2-4 years",
        a: "Cluster mode starts multiple Node.js worker processes that share the same port. It uses multiple CPU cores and increases throughput for stateless API requests. Background workers should usually not run in cluster mode unless job concurrency is intentionally designed.",
      },
      {
        q: "Why do we need backups for MongoDB?",
        level: "1-3 years",
        a: "Backups protect against accidental deletion, server failure, corrupted deployment, ransomware, and data migration mistakes. Production backups should be automated, retained, and periodically restored in a test environment.",
      },
      {
        q: "What is graceful shutdown?",
        level: "2-5 years",
        a: "Graceful shutdown handles SIGTERM/SIGINT by stopping new requests, closing the HTTP server, closing workers, disconnecting Redis/MongoDB, and exiting cleanly. It prevents data corruption and broken in-flight operations during deploys.",
      },
      {
        q: "What steps are needed before going live?",
        level: "2-5 years",
        a: "Set production env vars, strong secrets, HTTPS/SSL, domain DNS, Mongo/Redis credentials, Docker volumes, backup job, logs, admin creation, database index sync, health check, frontend API URL, firewall, monitoring, and smoke tests.",
      },
    ],
  },
  {
    title: "16. Advanced Architecture And Business Logic Patterns",
    intro:
      "These questions convert project concepts into strong interview talking points without exposing unnecessary internal details.",
    focus: [
      "Modular monolith is a valid architecture when boundaries are clean.",
      "Business logic includes wallet balances, referrals, rewards, admin reviews, notifications, reports, and support tickets.",
      "Financial systems need idempotency, auditability, and careful consistency.",
    ],
    questions: [
      {
        q: "What is a modular monolith?",
        level: "2-5 years",
        a: "A modular monolith is one deployable application organized into clear modules. It avoids microservice complexity while keeping boundaries clean. Modules can include auth, users, wallet, payments, admin, reports, notifications, and roles.",
      },
      {
        q: "When would you move from modular monolith to microservices?",
        level: "3-5 years",
        a: "Move only when independent scaling, team ownership, deployment frequency, or fault isolation clearly requires it. Before that, a modular monolith is simpler. Split candidates could be auth, payments, notifications, reporting, or background jobs.",
      },
      {
        q: "How do you design wallet balance logic safely?",
        level: "3-5 years",
        a: "Use atomic updates, balance checks, transaction records, status transitions, audit logs, and idempotency keys. Never rely only on frontend values. Keep available, locked, lifetime deposit, withdrawal, and rewards fields separate.",
      },
      {
        q: "How do you handle financial status transitions?",
        level: "3-5 years",
        a: "Define allowed statuses such as pending, approved, rejected, completed, failed, and expired. Only allow valid transitions, store reviewer and timestamps, and make repeated processing safe through unique indexes and status checks.",
      },
      {
        q: "What is eventual consistency?",
        level: "3-5 years",
        a: "Eventual consistency means different parts of the system may not update at the exact same instant, but they become consistent after background processing. Queue-based jobs, reports, and cached data often use eventual consistency.",
      },
      {
        q: "When should you use MongoDB transactions?",
        level: "3-5 years",
        a: "Use MongoDB transactions when multiple document updates must be atomic together, such as creating a transaction record and updating wallet balances where partial completion is unacceptable. They require replica set support and add overhead, so use them for critical consistency boundaries.",
      },
      {
        q: "What is idempotent job processing?",
        level: "3-5 years",
        a: "A job is idempotent if running it twice does not duplicate effects. Workers should check current record status, use unique indexes, use jobId, and update records safely so retries do not double-credit or double-debit.",
      },
      {
        q: "How would you design notifications?",
        level: "2-4 years",
        a: "Store notifications with userId, title/message, type, read flag, and timestamps. Use indexes on userId and createdAt. For real-time delivery, add WebSocket or push notifications later; for basic systems, polling unread notifications is enough.",
      },
      {
        q: "How would you design reports/dashboard APIs?",
        level: "3-5 years",
        a: "Use indexed filters, aggregation pipelines, pagination, date ranges, caching for expensive public data, and background pre-aggregation for very large datasets. Avoid computing massive reports synchronously on every request.",
      },
      {
        q: "How do you protect admin audit integrity?",
        level: "3-5 years",
        a: "Record who performed the action, entity type/id, metadata, IP, timestamps, and old/new values where needed. Restrict read access to super admins. For stronger integrity, use append-only logs or external log storage.",
      },
    ],
  },
  {
    title: "17. Experience-Level Interview Questions",
    intro:
      "Use this section according to your target experience. Start with 1-2 year answers, then add 3-5 year depth.",
    focus: [
      "For 1 year: definitions and basic implementation.",
      "For 2-3 years: explain middleware, auth, validation, DB indexes, and clean architecture.",
      "For 4-5 years: explain scaling, failures, consistency, observability, and trade-offs.",
    ],
    questions: [
      {
        q: "1 year: How does a login API work?",
        level: "1 year",
        a: "Client sends email/password. Backend validates input, normalizes email, finds user with password hash, compares password using bcrypt, checks account status, creates session, signs access and refresh tokens, sets HTTP-only cookies, records audit event, and returns safe user data.",
      },
      {
        q: "1 year: What middleware have you used in Express?",
        level: "1 year",
        a: "Common middleware includes helmet for security headers, cors for origin control, compression, cookie-parser, express.json body parser, request logger, rate limiter, auth middleware, validation middleware, not-found handler, and error handler.",
      },
      {
        q: "2 years: How do you structure an Express TypeScript project?",
        level: "2 years",
        a: "I structure by modules and layers: routes call controllers, controllers call services, services use repositories/models, validations use Zod, DTOs define response shapes, config handles env/database/redis/logger, and middlewares handle cross-cutting concerns like auth, rate limiting, and errors.",
      },
      {
        q: "2 years: How do you implement protected routes?",
        level: "2 years",
        a: "Add requireAuth middleware to verify JWT and set req.user. Then add requireRoles or requirePermissions for authorization. Finally validate request data and run controller logic. Sensitive routes also need rate limits and audit logs.",
      },
      {
        q: "3 years: How do you scale rate limiting across multiple API instances?",
        level: "3 years",
        a: "Use a shared store like Redis instead of in-memory counters. Every instance increments the same Redis keys, so limits are consistent across containers. Use prefixes per app/environment and set TTL according to the limiter window.",
      },
      {
        q: "3 years: How do you handle duplicate payment or transaction processing?",
        level: "3 years",
        a: "Use unique database indexes on transaction identifiers, status checks before processing, idempotent service logic, duplicate-safe queue jobId, and catch duplicate key errors. Repeated requests should return existing state or fail safely, not create duplicate money records.",
      },
      {
        q: "4 years: How would you scale this backend to 1 lakh registered users?",
        level: "4 years",
        a: "For 1 lakh registered users, code-level readiness includes indexes, Redis, API/worker separation, logs, backups, and Nginx load balancing. Infrastructure needs enough VPS resources, MongoDB tuning, Redis memory, monitoring, and load testing. Registered users are not the same as concurrent users.",
      },
      {
        q: "4 years: How would you scale to high concurrency?",
        level: "4 years",
        a: "Run multiple stateless API replicas behind Nginx/load balancer, use Redis for shared rate limits/cache/queues, move heavy work to workers, optimize Mongo indexes, use connection pooling, add CDN for frontend/static assets, monitor latency/error rates, and perform load tests before increasing traffic.",
      },
      {
        q: "5 years: What are the biggest production risks in financial backend systems?",
        level: "5 years",
        a: "Duplicate processing, race conditions, weak authentication, missing authorization, insufficient audit logs, bad secret management, missing backups, no monitoring, untested restore process, over-trusting frontend data, and lack of idempotency around money movement.",
      },
      {
        q: "5 years: How do you design for failure?",
        level: "5 years",
        a: "Assume external services fail. Add retries with backoff, timeouts, fallback paths, queue dead-letter/manual review, idempotency, circuit breakers where needed, clear status transitions, alerting, health checks, and operational runbooks.",
      },
    ],
  },
  {
    title: "18. Practical Rapid-Fire Definitions",
    intro:
      "Revise these before interviews. Give short definitions first, then expand if interviewer asks.",
    focus: [
      "Keep answers crisp: definition, why it matters, and one production example.",
    ],
    questions: [
      {
        q: "What is middleware?",
        level: "rapid-fire",
        a: "A function that runs between request and response and can modify req/res, stop the response, or call next().",
      },
      {
        q: "What is DTO?",
        level: "rapid-fire",
        a: "A Data Transfer Object that defines safe request/response data shape.",
      },
      {
        q: "What is RBAC?",
        level: "rapid-fire",
        a: "Role-Based Access Control: users get roles, roles get permissions, routes enforce permissions.",
      },
      {
        q: "What is JWT expiry?",
        level: "rapid-fire",
        a: "The time after which a JWT becomes invalid and must be refreshed or reissued.",
      },
      {
        q: "What is bcrypt salt?",
        level: "rapid-fire",
        a: "Random data mixed with password before hashing to prevent rainbow-table attacks.",
      },
      {
        q: "What is TTL?",
        level: "rapid-fire",
        a: "Time to live; data expires automatically after a duration in Redis or MongoDB TTL indexes.",
      },
      {
        q: "What is a queue?",
        level: "rapid-fire",
        a: "A system that stores jobs to be processed asynchronously by workers.",
      },
      {
        q: "What is backoff?",
        level: "rapid-fire",
        a: "Delay strategy before retrying a failed operation, often increasing after every failure.",
      },
      {
        q: "What is CORS?",
        level: "rapid-fire",
        a: "Browser security mechanism that controls which origins can call an API.",
      },
      {
        q: "What is Helmet?",
        level: "rapid-fire",
        a: "Express middleware that sets security HTTP headers.",
      },
      {
        q: "What is lean query?",
        level: "rapid-fire",
        a: "Mongoose query returning plain objects instead of full documents for better read performance.",
      },
      {
        q: "What is a compound index?",
        level: "rapid-fire",
        a: "An index on multiple fields, useful for common filter-plus-sort query patterns.",
      },
      {
        q: "What is graceful shutdown?",
        level: "rapid-fire",
        a: "Cleanly closing server, queues, Redis, and database connections before process exit.",
      },
    ],
  },
];

const children = [
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [text("Backend Interview Preparation Guide", { bold: true, size: 36 })],
    spacing: { after: 180 },
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [text("Express.js + TypeScript + MongoDB + Redis + BullMQ + Production Security", { size: 22 })],
    spacing: { after: 260 },
  }),
  paragraph(
    "This document is prepared for 1-5 years backend interview preparation. It avoids unnecessary deep code walkthroughs but uses the backend stack and production patterns as strong talking points.",
  ),
  paragraph(text("How to answer in interview:", { bold: true })),
  bullet("Start with a simple definition."),
  bullet("Explain why it matters in production."),
  bullet("Give one real backend example: auth, rate limiting, MongoDB index, Redis cache, BullMQ worker, logs, Docker, or Nginx."),
  bullet("For senior-level depth, mention trade-offs, failure cases, scaling, and security."),
];

for (const section of sections) {
  addSection(children, section);
}

children.push(
  heading("19. Final Revision Checklist"),
  bullet("Node.js: runtime, event loop, non-blocking I/O, async/await, thread pool, production error handling."),
  bullet("Express: middleware order, routes/controllers/services/repositories/models, centralized errors."),
  bullet("TypeScript: DTOs, z.infer, unknown vs any, declaration merging, build step."),
  bullet("Auth: bcrypt, JWT, access/refresh tokens, refresh rotation, HTTP-only cookies, OTP, session revocation."),
  bullet("Authorization: roles, permissions, ownership checks, 401 vs 403."),
  bullet("Validation: Zod body/params/query, regex, enums, amount limits, date validation."),
  bullet("Rate limiting: global, auth IP, auth identifier, OTP, refresh, financial, Redis shared counters, memory fallback."),
  bullet("MongoDB: schemas, refs, lean, atomic updates, aggregation, unique/sparse/compound/partial/TTL indexes, syncIndexes."),
  bullet("Redis: cache, TTL, key prefixes, distributed rate limit, queue dependency, password/ACL."),
  bullet("BullMQ: queue vs worker, attempts, exponential backoff, jobId idempotency, concurrency, failed jobs."),
  bullet("Security: Helmet, CORS, HTTPS, secure cookies, body limits, secrets, audit logs, dependency audit."),
  bullet("Production: Docker Compose, Nginx reverse proxy/load balancing, PM2, logs, backups, monitoring, health checks."),
  bullet("Scaling: 1 lakh registered users vs concurrent users, horizontal API replicas, Redis, Mongo indexes, worker scaling, load testing."),
);

const doc = new Document({
  styles: {
    default: {
      document: {
        run: {
          font: "Calibri",
          size: 22,
        },
      },
    },
  },
  sections: [
    {
      properties: {},
      children,
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(outputPath, buffer);
  console.log(outputPath);
});
