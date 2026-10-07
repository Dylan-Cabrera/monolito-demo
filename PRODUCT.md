# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Monolithic Node.js 22 + Express 5 with EJS server-side rendering. PostgreSQL 16 database. three.js 0.186 for 3D content (landing page and exhibition guide). No separate frontend framework.

## Users

**Productor (Producer/Farmer):** Small agricultural producers from Formosa who publish their products, set prices, manage stock, confirm and fulfill orders, and view sales analytics and summaries.

**Comprador (Buyer):** People searching for and purchasing farm products directly from producers. Can browse the catalog, filter by product or category, add items to cart, place orders, and track purchase history and status.

**Administrador Provincial (Administrator):** Provincial-level oversight role monitoring sales data, territorial distribution of sales, and category performance across all producers in the system.

All three user types carry equal product weight; the platform is designed to serve all three.

## Product Purpose

Mercado Chacarero eliminates intermediaries between small agricultural producers in Formosa and their buyers. Producers publish products at their chosen price, buyers discover goods directly and know their origin, and the marketplace provides transparency and control over the local food economy. Success means sustained producer participation, buyer trust in product origin, and a functioning direct-to-consumer market.

## Positioning

Hyperlocal agricultural marketplace. The core differentiation is emphasis on Formosa-specific producers and the local economy, ensuring producers retain margin control and buyers support their regional producers directly.

## Operating Context

Direct sales model for agricultural products in Formosa, Argentina. Producers manage inventory via a producer panel; buyers interact with a public catalog and shopping flow. The platform also serves as an exhibition guide using 3D visualization, supporting live presentations and onboarding in educational or promotional contexts (the `/arquitectura` route provides an interactive 11-step guide viewable in browser).

## Capabilities and Constraints

**Capabilities:**
- Product catalog: publish, edit, search, filter by category
- Shopping: cart across multiple producers, order confirmation in single transaction (stock check, discount from inventory)
- Order management: states track Pendiente → Confirmado → Entregado; cancellation from Pendiente or Confirmado restores stock
- Producer panel: product management, order confirmation/fulfillment, sales summaries
- Admin dashboard: sales overview by location and category
- 3D content: landing page and interactive exhibition guide (must be preserved)

**Technical Constraints:**
- Single-process monolithic architecture (scales vertically only)
- Shared PostgreSQL database for all data and sessions
- Server-side rendering (no client-side JS framework for views)
- Node.js 20+ required

**Business Rules (implemented and tested):**
- Only product owner can edit or delete their own products
- Order confirmation is atomic: rows locked, stock deducted, pedidos + items_pedido created in single transaction
- Multi-producer cart generates one pedido per producer
- Sold products cannot be deleted (marked hidden instead to preserve order history)
- Database enforces: price > 0, stock ≥ 0, valid status and role enums

## Brand Commitments

3D animations must be preserved, especially the exhibition guide at `/arquitectura`. Current three.js implementation is binding and performs a critical role in live presentations.

## Evidence on Hand

- Working monolithic application with 8 integration tests against PostgreSQL
- Seed data and demo users (5 producers, 1 buyer, 1 admin)
- Fonts: Bricolage Grotesque (variable) and Public Sans
- Complete schema in `src/db/schema.sql`
- Modular code structure: users, catalog, pedidos, reportes, guia modules with clear separation of concerns

## Product Principles

1. **Direct and transparent:** Eliminate the middleman; buyers see producer identity and product source; producers control their margins.
2. **Hyperlocal strength:** Formosa producers and economy come first; the platform is a tool for regional food systems.
3. **Simple and functional:** Monolithic design keeps the system coherent, transactional integrity intact, and deployment straightforward.
4. **Inclusive by role:** Producer, buyer, and admin workflows carry equal weight; no user type is secondary.
5. **Memorable experiences:** 3D visualization (landing page and exhibition guide) provides education, engagement, and a lasting first impression.
