# Product Requirements Document (PRD)
# Look Immo — Tunisian Real Estate Platform (lOOK-IMMO.TN)

**Version:** 1.0  
**Date:** 2026-06-06  
**Status:** Active Development  
**Language:** Bilingual (French UI / English technical docs)

---

## 1. Product Overview

**Look Immo** is a full-stack real estate SaaS platform targeting the Tunisian property market. It enables a real estate agency to showcase properties, manage client relationships, track appointments, handle finance, and operate a blog — all through a single integrated system.

The platform consists of:
- **Look-Immo-Front** — React 19 + TypeScript SPA (frontend)
- **Look-Immo-API** — Node.js + Express + Prisma REST API (backend)

**Tagline:** *"L'adresse de vos rêves"* — The address of your dreams.

---

## 2. Goals & Objectives

| Goal | Description |
|------|-------------|
| Showcase Properties | Display all agency listings (sale & rent) with rich media, maps, and filtering |
| Generate Leads | Convert visitors into appointment bookings and contact form submissions |
| CRM for Agents | Provide agents/admins with appointment management and client demand tracking |
| Agency Operations | Finance tracking, organic visit logging, site settings management |
| Content Marketing | Integrated blog for real estate guides and market news |
| Multi-currency | Display prices in TND, EUR, and USD |

---

## 3. Target Users

### 3.1 Public Visitors
- Buyers or renters browsing property listings
- Tunisian and international investors
- Anonymous — no login required

### 3.2 Registered Users (Clients)
- Registered website users
- Can save favorites, book visit appointments, rate properties

### 3.3 Agents
- Agency staff
- Can manage appointments, client demands, visits, transactions
- Cannot access admin-only settings or user management

### 3.4 Administrators
- Full access to all features
- Manage properties, users, blog, settings, notifications, stats

---

## 4. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend Framework | React 19 + TypeScript |
| Build Tool | Vite |
| Styling | TailwindCSS |
| Routing | React Router DOM v7 |
| Maps | Leaflet / React-Leaflet |
| Charts | Recharts |
| Real-time | Socket.IO Client |
| Drag & Drop | @dnd-kit/core, @dnd-kit/sortable |
| Icons | Lucide React |
| Backend Runtime | Node.js + TypeScript |
| Backend Framework | Express.js |
| ORM | Prisma |
| Database | PostgreSQL |
| Auth | JWT (access + refresh tokens) + httpOnly cookies |
| Password Hashing | bcryptjs |
| File Upload | Multer + Sharp (image optimization) |
| Validation | Zod |
| Security | Helmet, express-rate-limit, CORS |
| Process Manager | PM2 |

---

## 5. Feature Requirements

---

### 5.1 Public Features (No Authentication Required)

#### 5.1.1 Homepage
**Priority:** P0 (Critical)

- **Hero Section**: Full-viewport image carousel (auto-rotates every 5s) with overlaid search widget
- **Search Widget**:
  - Toggle tabs: Acheter (Buy) | Louer (Rent)
  - City/location dropdown with all available cities
  - "Rechercher" button navigates to filtered listings page
- **Featured Properties Section**: Horizontally scrollable cards of `isFeatured=true` properties
- **New Properties Section**: Cards of `isNew=true` properties
- **News Section**: Latest 3 blog posts preview cards
- **SEO**: Unique `<title>` and `<meta description>` per page via `useSEO` hook

#### 5.1.2 Property Listings Page
**Priority:** P0 (Critical)

- **Listing Grid**: Responsive grid/list of all active properties
- **Advanced Filters**:
  - Listing type: All / Sale / Rent
  - Property type: apartment, villa, depot, commercial, land, studio, duplex, triplex, penthouse, commerce
  - Price range: min/max slider or input (TND)
  - Minimum bedrooms
  - Minimum area (m²)
  - City filter
- **Sort**: by price, date, area
- **Empty State**: Informative message when no results match filters
- **Clear Filters**: Reset all filters

**API:** `GET /api/properties`, `GET /api/locations`

#### 5.1.3 Property Detail Page
**Priority:** P0 (Critical)

- **Image Gallery**: Full-screen image carousel with thumbnail strip
- **Property Info**: Title, type badge, listing type badge, status badge (available/sold/rented/pending)
- **Price Display**: In selected currency with per-m² or total toggle
- **Features**: Bedrooms, bathrooms, area (m²), parking, pool, garden, AC, heating, security, vocation, COS
- **Location Map**: Leaflet interactive map centered on property coordinates
- **Ratings**: Star rating display (1-5), count, average; submit rating form (star selector + comment)
- **Appointment Booking Form**: Client name, phone, preferred date/time, message, source channel
- **Favorites Toggle**: Heart button (authenticated users)
- **Related Properties**: Same city or type suggestions
- **SEO**: Property title and description in meta tags

**API:** `GET /api/properties/:id`, `POST /api/ratings`, `POST /api/appointments`, `POST/DELETE /api/favorites`

#### 5.1.4 Blog
**Priority:** P1 (High)

- **Blog List Page**: Grid of published blog post cards (title, category badge, excerpt, cover image, date)
- **Blog Post Page**: Full article with cover image, category, publish date, rich text content
- **Navigation**: Back to blog list

**API:** `GET /api/blog`, `GET /api/blog/:id`

#### 5.1.5 Contact Page
**Priority:** P1 (High)

- **Contact Form**: Full name, email, phone, subject, message; success/error notification on submit
- **Agency Info**: Address, phone, email, social links (Instagram, Facebook, WhatsApp)
- **Working Hours**: Weekday, Saturday, Sunday hours from site settings
- **Embedded Map**: Agency office location on Leaflet map

**API:** `POST /api/messages`, `GET /api/settings`

---

### 5.2 Authenticated User Features

#### 5.2.1 Authentication (Login / Register)
**Priority:** P0 (Critical)

- **Register**: Name, email, password; creates user with `role: user`
- **Login**: Email + password; returns JWT stored in httpOnly cookie
- **Logout**: Clears session
- **Token Refresh**: Silent token refresh on expiry
- **Rate Limiting**: Auth endpoints are rate-limited to prevent brute-force

**API:** `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `POST /api/auth/refresh`, `GET /api/auth/me`

#### 5.2.2 User Dashboard — Profile
**Priority:** P1 (High)

- View profile: name, email, phone, role badge
- Edit mode: update name, email, phone
- Avatar auto-generated from name (ui-avatars)
- Save changes persisted to database

**API:** `PUT /api/users/:id`

#### 5.2.3 User Dashboard — Favorites
**Priority:** P1 (High)

- List of saved favorite properties (image, title, city, bedrooms/bathrooms/area, price)
- Click property → navigate to property detail page
- Remove from favorites with heart button

**API:** `GET /api/favorites`, `DELETE /api/favorites/:propertyId`

#### 5.2.4 User Dashboard — Appointments
**Priority:** P1 (High)

- List upcoming appointments (pending, accepted, rejected)
- Status badges: En attente / Confirmé / Annulé
- Edit appointment: change date, time, message, linked property
- Cancel/delete appointment
- Today/tomorrow countdown labels

**API:** `GET /api/appointments`, `PUT /api/appointments/:id`, `DELETE /api/appointments/:id`

---

### 5.3 Agent / Admin CRM Features

#### 5.3.1 Dashboard CRM Stats
**Priority:** P1 (High)

- Stat cards: Appointments Today, Appointments Tomorrow, Active Client Demands, Matched Demands
- Visible to `agent` and `admin` roles on the Dashboard page

#### 5.3.2 Appointment Management (CRM)
**Priority:** P0 (Critical)

- **Create Appointment**: Client name, phone, source (Facebook/Instagram/TikTok/website/WhatsApp/other), meeting type (visit/call/meeting), date, time, property, additional properties, notes
- **Upcoming Appointments Widget**: Sorted chronologically, grouped by today/tomorrow labels
- **Accept / Reject**: One-click status change (agent/admin only)
- **Edit**: Update any appointment field
- **Delete**: Remove appointment from system

**API:** Full CRUD on `/api/appointments`

#### 5.3.3 Client Demand Management
**Priority:** P1 (High)

- **Create Demand**: Client name, phone, property type wanted, budget, preferred location, description, priority (high/medium/low), initial status
- **Status Pipeline**: searching → contacted → matched → closed
- **Update Demand**: Change any field or status
- **Delete Demand**
- **Stats**: Active demands count, matched demands count visible in dashboard stats

**API:** Full CRUD on `/api/demands`

#### 5.3.4 Working Hours Management
**Priority:** P2 (Medium)

- Admin/agent can view and edit agency working hours (weekdays, Saturday, Sunday) directly from the dashboard
- Changes saved to site settings

**API:** `GET/PUT /api/settings`

---

### 5.4 Admin-Only Features (Admin Panel)

#### 5.4.1 Property Management
**Priority:** P0 (Critical)

- **Create Property**:
  - Fields: title, description, price (TND), price type (total/per m²), property type, listing type, status, city, address, GPS coordinates, all feature flags, images
  - Flags: `isFeatured`, `isNew`, `isHotDeal`
  - Image upload with Sharp optimization (max width 1400px, quality 82%)
  - Drag-and-drop image reordering within a property
- **Edit Property**: Update any field or images
- **Delete Property**: Permanent deletion
- **Reorder Properties**: Drag rows in the table to change display order (`displayOrder` field)
- **Document Upload**: Upload PDF contracts linked to a property

**API:** Full CRUD on `/api/properties`, `/api/upload/property-image`, `/api/upload/property-document`

#### 5.4.2 User Management
**Priority:** P1 (High)

- View all users (name, email, role, registration date, last login)
- Create user with role assignment (user/agent/admin)
- Edit user profile and role
- Delete user
- "Viewed by Admin" flag to mark new users as seen

**API:** Full CRUD on `/api/users`

#### 5.4.3 Messages / Inbox
**Priority:** P1 (High)

- View all contact form messages (name, email, phone, subject, message, date)
- Read/unread status indicator
- Mark as read on open
- Delete message

**API:** Full CRUD on `/api/messages`

#### 5.4.4 Blog Management
**Priority:** P1 (High)

- Create blog post: title, category, excerpt, rich text content, cover image upload, published toggle
- Edit post: update all fields
- Toggle published/draft status
- Delete post

**API:** Full CRUD on `/api/blog`, `POST /api/upload/blog-image`

#### 5.4.5 Finance Transactions
**Priority:** P2 (Medium)

- Log real estate transactions: sale (`vente`) or rental (`location`)
- Fields: property title, client name, date, commission amount (TND), payment mode (cash/wire/cheque), payment received flag, notes
- Edit and delete transactions
- Summary view of total commissions

**API:** Full CRUD on `/api/transactions`

#### 5.4.6 Organic Visit Log
**Priority:** P2 (Medium)

- Record walk-in visitors to property showings
- Fields: visitor full name, ID card number, property visited, auto-timestamped visit date
- Delete entry

**API:** Full CRUD on `/api/visits`

#### 5.4.7 Ratings Management
**Priority:** P2 (Medium)

- View all submitted ratings (property, user, value, comment, date)
- Delete inappropriate ratings

**API:** `GET /api/ratings`, `DELETE /api/ratings/:id`

#### 5.4.8 Location Management
**Priority:** P2 (Medium)

- Add, edit, delete cities/locations used in property forms and public filters
- Reorder locations via drag-and-drop

**API:** Full CRUD on `/api/locations`, `PUT /api/locations/reorder`

#### 5.4.9 Notifications Center
**Priority:** P1 (High)

- Real-time notification badge showing unread count
- Notification list: new appointments, new messages, new ratings
- Mark individual or all notifications as read
- Delete individual or all read notifications

**API:** `/api/notifications/*`, Socket.IO for real-time push

#### 5.4.10 Analytics Dashboard
**Priority:** P2 (Medium)

- Line/bar charts (Recharts) for:
  - Monthly site visits vs leads generated
  - Property count by type
  - Property count by listing type (sale vs rent)
  - User registration trends
- Visit tracking: anonymous visits logged with `POST /api/stats/track-visit`

**API:** `/api/stats/dashboard`, `/api/stats/properties`, `/api/stats/users`

#### 5.4.11 Site Settings
**Priority:** P1 (High)

- Configure: website name, contact email, phone number, agency address
- Set agency GPS coordinates (used on contact page map)
- Social media links: Instagram, Facebook, WhatsApp
- Working hours: weekdays, Saturday, Sunday
- About text
- Discovery links (array of label + URL)

**API:** `GET /api/settings`, `PUT /api/settings`

---

### 5.5 Cross-Cutting Features

#### 5.5.1 Multi-Currency Support
**Priority:** P2 (Medium)

- Base currency: TND (Tunisian Dinar)
- Supported display currencies: TND, EUR, USD
- Currency switcher in site header
- Exchange rates fetched from external API
- All price components (`<Price />`) auto-convert based on selected currency

#### 5.5.2 Real-Time Notifications (Socket.IO)
**Priority:** P1 (High)

- Server emits events on: new appointment, new contact message, new property rating
- Admin client receives events via Socket.IO and shows toast + increments notification badge
- Connection established on admin login, disconnected on logout

#### 5.5.3 SEO
**Priority:** P1 (High)

- `useSEO` hook sets `<title>` and `<meta name="description">` per page
- Semantic HTML with proper heading hierarchy
- Every page has a unique `<h1>`

#### 5.5.4 Responsive Design
**Priority:** P0 (Critical)

- Mobile-first design using TailwindCSS responsive prefixes (`sm:`, `md:`, `lg:`)
- Navigation collapses to hamburger menu on mobile
- All forms and tables scroll horizontally on small screens

#### 5.5.5 Confirmation Dialogs
**Priority:** P1 (High)

- All destructive actions (delete, cancel appointment) show a confirmation modal via `useConfirm` context
- Modal shows action title, message, confirm/cancel buttons with danger variant styling

#### 5.5.6 Toast Notifications
**Priority:** P1 (High)

- `notificationStore` provides `notify.success()`, `notify.error()`, `notify.info()` throughout the app
- Toasts auto-dismiss after a few seconds
- Positioned top-right of viewport

---

## 6. Data Models

### Property
```
id, title, description, price (TND), priceType (total|per_m2),
location: { city, address, lat, lng },
features: { bedrooms, bathrooms, area, parking, pool, garden, airConditioning, heating, security, vocation, cos },
type: apartment|villa|depot|commercial|land|studio|duplex|triplex|penthouse|commerce,
listingType: sale|rent,
status: available|sold|rented|pending,
images: string[],
agentId, isFeatured, isNew, isHotDeal,
rating, averageRating, ratingsCount,
createdAt, displayOrder
```

### User
```
id, name, email, phone, role: user|agent|admin,
favorites: propertyId[],
avatar, registrationDate, lastLogin, viewedByAdmin
```

### Appointment
```
id, clientName, clientEmail, clientPhone,
propertyId, propertyTitle, userId,
date (YYYY-MM-DD), time (HH:MM), message, notes,
source: facebook|instagram|tiktok|website|whatsapp|other,
meetingType: visite|appel|reunion,
status: pending|accepted|rejected,
createdAt
```

### ClientDemand
```
id, clientName, phone, description, location,
type: appartement|villa|terrain|bureau|commerce,
budget, priority: high|medium|low,
status: searching|contacted|matched|closed,
createdAt, updatedAt, ignoredPropertyIds
```

### Message (Contact)
```
id, fullName, email, phone, subject, message,
sentDate, status: new|read
```

### BlogPost
```
id, title, category, excerpt, content, image,
createdAt, updatedAt, published
```

### Rating
```
id, propertyId, propertyTitle, userId, userName, userEmail,
value (1-5), timestamp, viewedByAdmin, comment
```

### FinanceTransaction
```
id, type: vente|location, propertyTitle, clientName, date,
commission, paymentReceived, paymentMode: espèces|virement|chèque,
notes, createdAt, updatedAt
```

### OrganicVisit
```
id, visitorName, idCardNumber, propertyVisited, visitDate
```

### SiteSettings
```
websiteName, contactEmail, phoneNumber, address,
location: { lat, lng },
socialMedia: { instagram, facebook, whatsapp },
workingHours: { weekdays, saturday, sunday },
aboutText, discoveryLinks: [{ label, url }]
```

---

## 7. API Endpoints Summary

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | /api/auth/register | No | — | Register new user |
| POST | /api/auth/login | No | — | Login, receive JWT |
| POST | /api/auth/logout | No | — | Logout |
| POST | /api/auth/refresh | No | — | Refresh access token |
| GET | /api/auth/me | Yes | authenticated | Get current user |
| GET | /api/users | Yes | agent/admin | List all users |
| POST | /api/users | Yes | admin | Create user |
| PUT | /api/users/:id | Yes | authenticated | Update user |
| DELETE | /api/users/:id | Yes | admin | Delete user |
| GET | /api/properties | Optional | — | List properties |
| GET | /api/properties/:id | Optional | — | Get property details |
| POST | /api/properties | Yes | agent/admin | Create property |
| PUT | /api/properties/reorder | Yes | admin | Reorder properties |
| PUT | /api/properties/:id | Yes | agent/admin | Update property |
| DELETE | /api/properties/:id | Yes | agent/admin | Delete property |
| GET | /api/appointments | Yes | authenticated | List appointments |
| POST | /api/appointments | No | — | Book appointment |
| PUT | /api/appointments/:id | Yes | authenticated | Update appointment |
| DELETE | /api/appointments/:id | Yes | authenticated | Delete appointment |
| GET | /api/demands | Yes | agent/admin | List client demands |
| POST | /api/demands | Yes | agent/admin | Create demand |
| PUT | /api/demands/:id | Yes | agent/admin | Update demand |
| DELETE | /api/demands/:id | Yes | agent/admin | Delete demand |
| GET | /api/visits | Yes | agent/admin | List organic visits |
| POST | /api/visits | Yes | agent/admin | Log a visit |
| DELETE | /api/visits/:id | Yes | agent/admin | Delete visit |
| GET | /api/messages | Yes | agent/admin | List messages |
| POST | /api/messages | No | — | Submit contact form |
| PUT | /api/messages/:id | Yes | agent/admin | Update message |
| DELETE | /api/messages/:id | Yes | admin | Delete message |
| GET | /api/transactions | Yes | agent/admin | List transactions |
| POST | /api/transactions | Yes | agent/admin | Create transaction |
| PUT | /api/transactions/:id | Yes | agent/admin | Update transaction |
| DELETE | /api/transactions/:id | Yes | agent/admin | Delete transaction |
| GET | /api/ratings | No | — | List ratings |
| POST | /api/ratings | No | — | Submit rating |
| DELETE | /api/ratings/:id | Yes | agent/admin | Delete rating |
| GET | /api/locations | No | — | List locations |
| POST | /api/locations | Yes | admin | Create location |
| PUT | /api/locations/reorder | Yes | admin | Reorder locations |
| PUT | /api/locations/:id | Yes | admin | Update location |
| DELETE | /api/locations/:id | Yes | admin | Delete location |
| GET | /api/blog | No | — | List blog posts |
| GET | /api/blog/:id | No | — | Get blog post |
| POST | /api/blog | Yes | admin | Create blog post |
| PUT | /api/blog/:id | Yes | admin | Update blog post |
| DELETE | /api/blog/:id | Yes | admin | Delete blog post |
| GET | /api/notifications | Yes | admin | List notifications |
| PUT | /api/notifications/:id/read | Yes | admin | Mark as read |
| PUT | /api/notifications/mark-all-read | Yes | admin | Mark all read |
| DELETE | /api/notifications/:id | Yes | admin | Delete notification |
| POST | /api/stats/track-visit | Optional | — | Track page visit |
| GET | /api/stats/dashboard | Yes | admin | Dashboard stats |
| GET | /api/stats/properties | Yes | admin | Property stats |
| GET | /api/stats/users | Yes | admin | User stats |
| GET | /api/favorites | Yes | authenticated | Get favorites |
| POST | /api/favorites | Yes | authenticated | Add favorite |
| DELETE | /api/favorites/:propertyId | Yes | authenticated | Remove favorite |
| GET | /api/settings | No | — | Get site settings |
| PUT | /api/settings | Yes | admin | Update settings |
| POST | /api/upload/property-image | Yes | agent/admin | Upload image |
| POST | /api/upload/property-document | Yes | agent/admin | Upload document |
| POST | /api/upload/blog-image | Yes | admin | Upload blog image |
| GET | /api/download | No | — | Download file |

---

## 8. Non-Functional Requirements

| Requirement | Description |
|-------------|-------------|
| Performance | First contentful paint < 2s on broadband; images optimized with Sharp (max 1400px wide, quality 82%) |
| Security | JWT in httpOnly cookies, Helmet security headers, rate-limiting on auth endpoints, Zod input validation |
| Scalability | PM2 cluster mode for production; Prisma ORM for database abstraction |
| Accessibility | Semantic HTML, ARIA labels on interactive elements, keyboard-navigable forms |
| SEO | Unique title/meta per page, semantic heading hierarchy, fast load times |
| Responsiveness | Mobile-first, tested at 375px, 768px, 1280px, 1440px breakpoints |
| Internationalization | Primary language: French (UI). Technical code: English |
| Real-time | Socket.IO for admin notifications with < 1s delivery latency |

---

## 9. Known Limitations & Future Roadmap

### Current Limitations
| Issue | Location | Impact |
|-------|----------|--------|
| Exchange rates may be stale | CurrencyContext | EUR/USD prices slightly inaccurate |
| Images stored on server filesystem | Backend `/uploads` | No CDN; not horizontally scalable |
| Socket.IO real-time only for admin | socketService.ts | Regular users need page refresh for updates |

### Future Roadmap (v2+)
- [ ] WhatsApp chatbot integration for automated lead capture
- [ ] Property PDF brochure generation
- [ ] Advanced analytics with Google Analytics / Plausible
- [ ] CDN integration for image delivery (Cloudinary / S3)
- [ ] Arabic language support (RTL layout)
- [ ] Mobile app (React Native)
- [ ] AI-powered property recommendations
- [ ] Virtual tour (360° images / video)
- [ ] Electronic contract signing
- [ ] SMS notifications for appointment confirmations

---

## 10. Acceptance Criteria Summary

| Feature | Acceptance Criteria |
|---------|---------------------|
| Property Search | User can filter by type, listing, price, bedrooms, area, city and see matching results |
| Property Detail | Full details, gallery, map, ratings form, and appointment form all render correctly |
| Authentication | Register/login/logout flow works; protected routes redirect unauthenticated users |
| Appointment Booking | Public visitor can book without login; agent/admin can accept/reject; all see appointments in dashboard |
| Admin Property CRUD | Admin can create/edit/delete property with images in < 3 minutes |
| Real-time Notifications | Admin receives notification within 1s of new appointment/message/rating submission |
| Multi-currency | Currency switcher updates all price displays immediately across all pages |
| Mobile Responsive | All pages render correctly on 375px viewport without horizontal scroll |
| Blog | Published posts appear on blog page; drafts are hidden from public |
| Contact Form | Submitted messages appear in admin messages inbox within seconds |
