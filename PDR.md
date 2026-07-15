# Product Design Requirements (PDR)
## Look Immo — Tunisian Real Estate Platform (lOOK-IMMO.TN)

**Version:** 1.4  
**Date:** 2026-07-15  
**Status:** Active Development  
**Primary Target Market:** Tunisian Real Estate Industry  
**Language Context:** Bilingual (French for the User Interface, English for Technical Documentation and API design)

---

## Changelog

| Version | Date | Summary of Changes |
| :--- | :--- | :--- |
| 1.0 | 2026-06-21 | Initial PDR — full platform specification |
| 1.1 | 2026-07-XX | Added appointment time input (free-text), VPS image carousel fix, blog section bug fix |
| 1.2 | 2026-07-XX | Property search with thumbnail preview in admin appointment form |
| 1.3 | 2026-07-XX | Property card title truncation (single-line ellipsis), admin header scroll behavior |
| 1.4 | 2026-07-15 | Admin header always-visible (sticky), notification system, appointment time as free text, property thumbnail in search |

---

## 1. Product Overview

**Look Immo** is a modern, full-stack real estate SaaS platform tailored for the Tunisian property market. It provides a real estate agency with a single, integrated hub to:
*   Showcase available properties for sale and rent.
*   Capture public visitor interest and convert them into scheduled appointments or contact inquiries.
*   Manage client relations via an agent/admin CRM (appointment pipeline, demand matching).
*   Perform operational actions (registering walk-in visits with ID cards, tracking commissions).
*   Run content marketing via a publishing blog.
*   Control system-wide options (social links, GPS location, business hours).
*   Send and receive real-time in-app notifications via Socket.IO.

### Architecture & Repositories
The workspace is split into two primary components:
1.  **Frontend ([Look-Immo-Front](file:///c:/Users/LOOK%20IMMO/Desktop/lOOK-IMMO.TN/Look-Immo-Front))**: A React 19 + TypeScript SPA built with Vite and styled with TailwindCSS. It handles public navigation, search filters, interactive mapping via Leaflet, user dashboards, and real-time alerts.
2.  **Backend ([Look-Immo-API](file:///c:/Users/LOOK%20IMMO/Desktop/lOOK-IMMO.TN/Look-Immo-API))**: An Express.js REST API using TypeScript and Prisma ORM to interact with a PostgreSQL database. It handles JWT authentication (via httpOnly cookies), file upload pipelines, image compression with Sharp, database seeding, and Socket.IO servers.

---

## 2. Key Objectives & Goals

*   **Premium Visual Showcase:** Render property listings with high-quality galleries, filters, and dynamic interactive maps.
*   **Lead Conversion:** Make it effortless for visitors to book property visits or make contact.
*   **CRM Hub:** Centralize lead tracking, client requests, appointments, and walk-in viewings for agents.
*   **Operations & Finances:** Log financial transactions (sales/rentals), track agency commission metrics, and verify offline client identities (visit records).
*   **Organic Reach:** Drive organic search traffic using optimized SEO meta attributes and blog content.
*   **Multi-Currency Support:** Dynamically convert prices to TND, EUR, and USD to cater to local and foreign investors.

---

## 3. User Roles & Permissions

| Role | Permissions & Capabilities |
| :--- | :--- |
| **Public Visitor** | Browses property listings, filters properties, views the blog, submits contact forms, rates properties, and requests appointments. No login required. |
| **Client (Registered User)** | Has all public visitor capabilities, plus profile editing, saving favorite listings, and viewing/managing their booked appointments in their dashboard. |
| **Agent** | Full access to CRM tools: dashboard metrics, managing appointments (accept, reject, update), client demands, visit logs, and transaction records. |
| **Administrator** | Full system administration. Can manage users and roles, properties (create, edit, delete, reorder), blog posts, site settings, notifications, and view system analytics. |

---

## 4. Tech Stack

### Frontend Layer
*   **Framework & Language:** React 19, TypeScript
*   **Build Tool:** Vite
*   **Styling:** TailwindCSS
*   **Routing:** React Router DOM v7
*   **Maps Integration:** Leaflet / React-Leaflet
*   **Data Visualization:** Recharts
*   **Real-time Communication:** Socket.IO Client
*   **Interactive Components:** `@dnd-kit/core` & `@dnd-kit/sortable` (for property/location reordering)
*   **Icons:** Lucide React

### Backend Layer
*   **Runtime:** Node.js (TypeScript via `ts-node-dev`)
*   **Server Framework:** Express.js
*   **Database Layer:** PostgreSQL
*   **Object-Relational Mapping (ORM):** Prisma Client
*   **Authentication:** JSON Web Token (JWT) with HTTP-only cookies
*   **Security:** Helmet, CORS, express-rate-limit
*   **Data Validation:** Zod
*   **Media Processing:** Multer + Sharp (resizing, WebP/JPEG encoding)
*   **Deployment & Management:** PM2 (ecosystem configuration)

---

## 5. System Features

### 5.1 Public Features (Unauthenticated)

#### 5.1.1 Homepage
*   **Hero Carousel:** Automatically transitions between featured images every 5 seconds. Includes an integrated search overlay.
    *   **VPS Smooth Transition Fix:** CSS transitions are applied using `opacity` and `transition-opacity` with a short cross-fade duration so the carousel animates smoothly even on VPS/production where GPU acceleration may differ from local dev.
    *   **Blog Section Stability:** The blog section grid layout on the homepage is stabilized to handle 3+ blog posts without causing layout overflow or visual bugs on VPS.
*   **Search Widget:** Allows searching for "Acheter" (Buy) or "Louer" (Rent) properties across Tunisian cities.
*   **Featured & Hot Properties:** Displays scrollable lists of listings marked `isFeatured` or `isHotDeal`.
*   **Organic SEO:** SEO meta updates for keywords, description, and title are automatically driven page-by-page.

#### 5.1.2 Listings & Filter Page
*   **Flexible Filters:** Filter properties by listing type (Sale/Rent), category (Apartment, Villa, Land, Commercial, Depot, etc.), price range, bedrooms, area size, and city.
*   **Sorting Options:** Sort properties by price, creation date, or size.
*   **Reset Controls:** Easily clear all active filters to view all listings.
*   **Property Card Titles:** Long property titles are truncated with an ellipsis (`...`) after one line using `truncate` / `line-clamp-1` to prevent multi-line overflow in cards.

#### 5.1.3 Property Details Page
*   **Interactive Gallery:** Offers a full-width image viewport with thumbnail scrolling.
*   **Details & Amenities:** Lists property size, bathrooms, bedrooms, and amenities (AC, heating, pool, garden, security, VOC, COS).
*   **Leaflet Mapping:** Shows the exact or general property location on an interactive map.
*   **Client Booking Widget:** Enables visitors to book appointments by submitting their name, phone, date, time, notes, and contact channel.
*   **User Ratings:** Interactive review module where clients can submit ratings out of 5 stars with a text comment.

#### 5.1.4 Contact & Agency Info
*   **Contact Form:** Submits name, email, phone, subject, and message directly to the backend inbox.
*   **Office Information:** Displays agency location map, phone numbers, and operational hours.

---

### 5.2 Registered User Dashboard

*   **Profile Management:** Edit personal details (name, email, phone) and automatically generate avatar graphics.
*   **Favorites List:** Save property listings to a dedicated favorites tab.
*   **Appointment Management:** Track requested appointments, reschedule date/time, cancel bookings, and view current approval status.

---

### 5.3 Agent & Admin CRM Dashboard

*   **Real-time Analytics:** Track daily appointments, active buyer/tenant demands, and match statuses.
*   **Client Demand Pipeline:** Track buyer requirements (desired category, budget, location) and transition status from `searching` -> `contacted` -> `matched` -> `closed`.
*   **Appointment Actions:** Approve or decline appointment requests, reschedule visits, and log notes.
*   **Working Hours:** Update agency operational hours displayed to the public.
*   **Real-time Notifications:** Receive instant Socket.IO push notifications when new appointments or contact form submissions arrive. Notifications display a badge counter and a dropdown list with read/unread management.

---

### 5.4 Administrative Management

*   **Property CRUD:** Create, edit, and delete properties. Includes drag-and-drop support to arrange image order.
*   **User & Role Management:** Control user accounts, update security clearances, and view registration/login timelines.
*   **Blog Publishing:** Write, update, publish, or draft posts with inline images and category tagging.
*   **Finance Transactions:** Log transaction history, record commission percentages, toggle payment statuses (received/pending), and filter by payment type (cash, check, bank transfer).
*   **Offline Visit Logs:** Document physical property viewings by recording visitor names and ID card numbers.
*   **System Settings:** Customize core settings like site name, email, phone numbers, social media links, and coordinate pins for the maps.

---

### 5.5 Admin Panel UX Decisions

#### 5.5.1 Admin Header Behavior
*   The admin panel header is **always visible** and **sticky at the top** of the admin layout. The earlier experimental "auto-hide on scroll" feature was removed due to layout feedback loop bugs on VPS.
*   The header uses `sticky top-0 z-30` so it remains at the top of the content area while the sidebar remains fixed.

#### 5.5.2 Appointment Form — Time Input
*   The appointment time field is a **free-text input** (`<input type="text">`) instead of a dropdown list.
*   This supports non-standard times (e.g., `20:30`, `09:15`, `Matin`) that would otherwise be excluded from a fixed range picker.
*   A placeholder hint (e.g., `Ex: 10:30`) is shown to guide the user.

#### 5.5.3 Property Search with Thumbnail Preview
*   In the "Add/Edit Appointment" form, the property search field shows a **thumbnail image** next to each result in the dropdown suggestions.
*   The thumbnail is sized small (`w-10 h-10 object-cover rounded`) so it doesn't dominate the list item.
*   Property titles that exceed one line are truncated with ellipsis to maintain a clean, compact list.

---

## 6. Database Schema Summary

The database uses PostgreSQL with the following core entities defined in [schema.prisma](file:///c:/Users/LOOK%20IMMO/Desktop/lOOK-IMMO.TN/Look-Immo-API/prisma/schema.prisma):

```mermaid
erDiagram
    USER ||--o{ PROPERTY : owns
    USER ||--o{ VISIT : performs
    USER ||--o{ FAVORITE : saves
    USER ||--o{ RATING : writes
    PROPERTY ||--o{ APPOINTMENT : references
    PROPERTY ||--o{ VISIT : receives
    PROPERTY ||--o{ RATING : receives
    PROPERTY ||--o{ FAVORITE : receives
    USER ||--o{ NOTIFICATION : receives

    USER {
        string id PK
        string name
        string email UK
        string password
        string phone
        Role role
        datetime createdAt
        datetime updatedAt
        datetime lastLogin
    }

    PROPERTY {
        string id PK
        string title
        string description
        float price
        PriceType priceType
        PropertyType type
        string city
        string zone
        PropertyStatus status
        string[] images
        float latitude
        float longitude
        json features
        string category
        boolean isFeatured
        boolean isNew
        boolean isHotDeal
        int displayOrder
        string ownerId FK
    }

    APPOINTMENT {
        string id PK
        string clientName
        string clientEmail
        string clientPhone
        AppointmentSource source
        AppointmentMeetingType meetingType
        datetime date
        string time
        AppointmentStatus status
        string notes
        string propertyId FK
    }

    VISIT {
        string id PK
        string visitorName
        string idCard
        datetime date
        string notes
        string propertyId FK
        string userId FK
    }

    CLIENT_DEMAND {
        string id PK
        string clientName
        string phone
        string description
        string location
        DemandPropertyType type
        float budget
        DemandPriority priority
        DemandStatus status
        string[] ignoredPropertyIds
    }

    FINANCE_TRANSACTION {
        string id PK
        string type
        string propertyTitle
        string clientName
        datetime date
        float commission
        boolean paymentReceived
        string paymentMode
        string notes
    }

    NOTIFICATION {
        string id PK
        string userId FK
        string title
        string message
        boolean isRead
        string type
        datetime createdAt
    }
```

### 6.1 Database Migration Protocol

To prevent downtime and ensure system stability during schema changes, the following migration protocol must be followed:

1. **Version Control:** All migration files generated by Prisma (`prisma/migrations/*`) must be committed to version control (`git`) along with the schema updates.
2. **Testing:** Before deploying to production, migrations must be applied and tested on a Staging database that closely mirrors the production database's size and structure.
3. **Deployment Window:** Deploy production migrations during a designated maintenance window (low-traffic periods).
4. **Command Execution:**
   - Use `npx prisma migrate deploy` in production environments (never `migrate dev` or `db push`).
5. **Rollback Strategy (Plan B):**
   - **Backwards-Compatible Design:** Design schema changes to be backwards-compatible (e.g. adding nullable columns or new tables) to avoid breaking active servers before/during code updates.
   - **Restoration from Backup:** Take an automated snapshot/backup of the database immediately before applying migrations. If a critical failure occurs, restore the database to this backup and revert the application deployment.
   - **Manual Scripts:** For complex or destructive migrations, write and test a corresponding SQL rollback script in advance.
   - **Migrate Resolve:** If a migration fails mid-way, use `npx prisma migrate resolve` to mark failed steps and resolve states manually without corrupting the database.

---

## 7. API Endpoints Reference

| Category | Method | Endpoint | Authorization | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/auth/register` | Public | Create client account |
| | `POST` | `/api/auth/login` | Public | Authenticate & set cookie |
| | `POST` | `/api/auth/logout` | Public | Clear auth session |
| | `POST` | `/api/auth/refresh` | Public | Issue new access token |
| | `GET` | `/api/auth/me` | Authenticated | Get current session user |
| **Properties** | `GET` | `/api/properties` | Public | Search/filter properties |
| | `GET` | `/api/properties/:id` | Public | Fetch property details |
| | `POST` | `/api/properties` | Agent/Admin | Create a new property |
| | `PUT` | `/api/properties/:id` | Agent/Admin | Edit property details |
| | `DELETE` | `/api/properties/:id` | Agent/Admin | Delete property |
| **Appointments** | `POST` | `/api/appointments` | Public | Request a booking |
| | `GET` | `/api/appointments` | Authenticated | View booked appointments |
| | `PUT` | `/api/appointments/:id` | Authenticated | Modify an appointment |
| | `DELETE` | `/api/appointments/:id` | Authenticated | Cancel/delete appointment |
| **Demands** | `GET` | `/api/demands` | Agent/Admin | View client demands |
| | `POST` | `/api/demands` | Agent/Admin | Save client requirement |
| | `PUT` | `/api/demands/:id` | Agent/Admin | Update demand pipeline |
| | `DELETE` | `/api/demands/:id` | Agent/Admin | Delete demand |
| **Visits & CRM** | `GET` | `/api/visits` | Agent/Admin | List walk-in visits |
| | `POST` | `/api/visits` | Agent/Admin | Log visit details |
| | `GET` | `/api/transactions` | Agent/Admin | View logged commissions |
| | `POST` | `/api/transactions` | Agent/Admin | Log sale or rent commission |
| **Notifications** | `GET` | `/api/notifications` | Agent/Admin | Fetch user notifications |
| | `PUT` | `/api/notifications/:id/read` | Agent/Admin | Mark notification as read |
| | `PUT` | `/api/notifications/read-all` | Agent/Admin | Mark all notifications read |
| | `DELETE` | `/api/notifications/:id` | Agent/Admin | Delete a notification |
| **Settings** | `GET` | `/api/settings` | Public | Fetch site configuration |
| | `PUT` | `/api/settings` | Admin | Edit website settings |
| **Uploads** | `POST` | `/api/upload/property-image` | Agent/Admin | Upload property picture |
| | `POST` | `/api/upload/property-document` | Agent/Admin | Upload PDF agreement |

---

## 8. Non-Functional & System Requirements

### 8.1 Performance
*   **Media Compression:** Image uploads must pass through Sharp pipeline, restricting dimension width to 1400px with a 82% quality setting, outputting web-friendly formats.
*   **Page Loading:** Core public pages (listings, homepage) should render in under 2 seconds.
*   **VPS Rendering:** CSS animations (carousels, transitions) must be validated on VPS/production, not just local. Use `opacity`-based transitions instead of `transform`-only where rendering consistency is required.

### 8.2 Security
*   **Session Management:** Keep JWTs in secure, httpOnly cookies to mitigate Cross-Site Scripting (XSS) risks.
*   **Traffic Restraints:** Apply `express-rate-limit` on login, registration, and contact form submissions.
*   **Zod Validations:** Strictly enforce typed boundaries on incoming payloads on the server.

### 8.3 SEO & UI Design
*   **Dynamic Head Tags:** Use react state hooks to modify title and meta descriptions on the fly.
*   **Mobile Adaptiveness:** Fully responsive interface designed via Tailwind CSS viewport prefixes, optimized for 375px up to 1440px widths.
*   **Micro-interactions:** Add interactive hover transitions and dynamic alerts to create a premium feel.
*   **Text Truncation:** Property card titles and search result labels must truncate at one line to maintain consistent card heights across all screen sizes.

---

### 8.4 Known VPS Constraints & Fixes
*   **Carousel Jitter:** On VPS, JS-based `setInterval` animation combined with CSS `transform: translateX` can stutter. Fixed by using `opacity` fade transitions instead.
*   **Blog Grid Overflow:** Rendering more than 2 blog cards in a CSS grid on VPS caused layout shifts. Fixed by ensuring grid column definitions are explicit and items have `min-w-0` to prevent overflow.
*   **Admin Header Scroll Feedback Loop:** The experimental auto-hide header caused a scroll feedback loop (animating the header changed the main container height → changed `scrollTop` → re-triggered scroll handler). Removed. Header is now always visible.

---

## 9. Future Roadmap & Enhancements

*   **Brochure Generator:** Support PDF downloads for property listings.
*   **WhatsApp CRM Sync:** Connect directly with local agents to auto-schedule appointments.
*   **CDN Integration:** Store user-uploaded images on AWS S3 or Cloudinary instead of the backend filesystem.
*   **Arabic Language Toggle:** Fully support dual French/Arabic translation options.
*   **Virtual Viewing:** Enable interactive 360-degree virtual property tours.
*   **Push Notifications (Web):** Extend the current in-app Socket.IO notifications to browser push notifications using the Web Push API.
