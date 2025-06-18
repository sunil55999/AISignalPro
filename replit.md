# AI Signal Parser - Trading Assistant

## Overview

This is a comprehensive AI-powered trading signal parser that extracts structured data from both text messages and images (via OCR). The application is designed to exceed commercial tools like telegram-signals-copier.com by providing high-accuracy parsing of trading instructions with support for complex order modifications and user-defined rules.

The system features a React frontend with shadcn/ui components, an Express.js backend, and PostgreSQL database with Drizzle ORM for data persistence.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for client-side routing
- **Build Tool**: Vite with React plugin

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful endpoints with structured JSON responses
- **Request Processing**: Express middleware for logging and error handling
- **Development**: Hot reload with Vite integration in development mode

### Database Architecture
- **Database**: PostgreSQL 16 (configured via Replit modules)
- **ORM**: Drizzle ORM with type-safe queries
- **Schema Management**: Drizzle Kit for migrations
- **Connection**: Neon Database serverless driver for PostgreSQL connectivity

## Key Components

### Signal Processing Engine
- **NLP Parser**: Custom JavaScript class for extracting trading data from natural language
- **OCR Support**: Processes image-based signals via OCR text extraction
- **Confidence Scoring**: Calculates parsing confidence based on extracted elements
- **Intent Recognition**: Identifies order types (market, pending, modifications)

### Database Tables
- **users**: Authentication and user management
- **signals**: Parsed trading signals with metadata and confidence scores
- **manualRules**: User-defined parsing rules for custom patterns
- **trainingData**: Dataset for improving parsing accuracy

### User Interface Components
- **Dashboard**: Overview with quick signal parsing and recent activity
- **Signal Parser**: Dedicated interface for manual signal input and testing
- **Parse History**: Table view of all processed signals with filtering
- **Training Data**: Management interface for training dataset
- **Rule Engine**: Custom rule creation and management
- **Analytics**: Statistics and performance metrics

## Data Flow

1. **Signal Input**: User provides text or image-based trading signal
2. **Preprocessing**: Text extraction via OCR for images, normalization
3. **NLP Analysis**: Custom parser extracts trading pairs, actions, prices, and modifiers
4. **Rule Application**: Check for matching manual rules or AI-based parsing
5. **Confidence Calculation**: Score based on successfully extracted elements
6. **Database Storage**: Persist parsed signal with metadata and confidence
7. **Response**: Return structured JSON with all extracted trading data

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL connection for Neon Database
- **drizzle-orm**: Type-safe database queries and schema management
- **@tanstack/react-query**: Server state management and caching
- **@radix-ui/***: Accessible UI component primitives
- **class-variance-authority**: Utility for component variant management
- **zod**: Runtime type validation and schema parsing

### Development Tools
- **tsx**: TypeScript execution for development server
- **esbuild**: Fast bundling for production builds
- **tailwindcss**: Utility-first CSS framework
- **@replit/vite-plugin-***: Replit-specific development enhancements

## Deployment Strategy

### Development Environment
- **Runtime**: Replit with Node.js 20, Web, and PostgreSQL 16 modules
- **Server**: Development server runs on port 5000 with Vite middleware
- **Database**: PostgreSQL instance provisioned through Replit
- **Hot Reload**: Vite HMR for frontend, tsx for backend file watching

### Production Build
- **Frontend**: Vite builds React app to `dist/public` directory
- **Backend**: ESBuild bundles server code to `dist/index.js`
- **Deployment**: Replit autoscale deployment with external port 80
- **Environment**: Production mode with optimized builds and static file serving

### Database Management
- **Migrations**: Drizzle Kit manages schema changes via `migrations/` directory
- **Schema**: Centralized in `shared/schema.ts` with Zod validation
- **Environment**: `DATABASE_URL` environment variable for connection string

## Changelog
```
Changelog:
- June 18, 2025. Initial setup
```

## User Preferences
```
Preferred communication style: Simple, everyday language.
```