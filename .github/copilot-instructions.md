# Copilot Instructions for 雀友聚

This is a **React + TypeScript** location-based mahjong meetup platform powered by Supabase.

## Build & Test Commands

### Development

```bash
# Start dev server (port 8080)
bun dev

# Build for production
bun build

# Build in development mode (for debugging)
bun build:dev
```

### Testing & Linting

```bash
# Run unit tests (once)
bun test

# Run unit tests in watch mode
bun test:watch

# Run a single test file
bun test src/contexts/__tests__/AuthContext.test.tsx

# Run e2e tests
bun test:e2e

# Run e2e tests with headed browser (see the test running)
bun test:e2e:headed

# Lint all code
bun lint
```

## High-Level Architecture

### Core Stack
- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite (port 8080)
- **Styling**: Tailwind CSS + Shadcn UI components
- **State & Data**: TanStack Query (React Query) for server state, React Context for app state
- **Routing**: React Router v6 with auth/admin protection
- **Backend**: Supabase (PostgreSQL database + Auth)
- **Forms**: React Hook Form + Zod validation

### Route Structure

**Public Routes**:
- `/` - Home
- `/community` - Browse groups/meetups
- `/login` - Authentication
- `/onboarding` - New user setup

**Protected Routes** (wrap with `<RequireAuth>`):
- `/profile/:id` - View user profile
- `/profile/edit` - Edit own profile
- `/group/:id` - Group/meetup details
- `/group/create` - Start new meetup
- `/group/:id/chat` - In-group chat
- `/group/:id/review` - Post-meetup reviews
- `/friends` - Friend list
- `/dm/:friendId` - Direct messaging
- `/my-groups` - User's groups
- `/notifications` - Message center
- `/host/requests` - Group host request management
- `/settings` - Account settings

**Admin Routes** (wrap with `<RequireAdmin>`):
- `/admin` - Admin dashboard

### Context & Global State

- **AuthContext** (`src/contexts/AuthContext.tsx`): User session, authentication state
- **CityContext** (`src/contexts/CityContext.tsx`): Current city selection
- **TanStack Query**: Server state (friends, groups, messages, notifications)

### Component Organization

```
src/components/
├── ui/              # Shadcn UI base components (don't modify)
├── shared/          # Reusable: UserAvatar, EmptyState, LoadingState, etc.
├── auth/            # Auth: RequireAuth, RequireAdmin, LoginForm
├── friends/         # Friend features
├── home/            # Homepage components
├── layout/          # Layout wrappers
└── map/             # Location/map components
```

### Data Flow Pattern

All server state follows this pattern:

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useMyData() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['mydata', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('table_name')
        .select('...')
        .eq('user_id', user!.id);
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (updates) => {
      const { error } = await supabase
        .from('table_name')
        .update(updates)
        .eq('id', updates.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mydata'] });
    },
  });
}
```

## Key Conventions

### TypeScript Configuration
- `noImplicitAny: false` - Implicit any allowed (be lenient)
- `strictNullChecks: false` - Null checking relaxed (use optional chaining anyway)
- Path alias: `@/*` resolves to `src/*`

### Import Conventions
- **UI components**: `import { Button } from '@/components/ui/button'`
- **Custom hooks**: `import { useAuth } from '@/contexts/AuthContext'` or from `@/hooks/`
- **Supabase**: `import { supabase } from '@/integrations/supabase/client'`
- **Types**: `import type { Database } from '@/integrations/supabase/types'`

### Component Patterns

**Functional components with TypeScript**:
```typescript
interface MyComponentProps {
  userId: string;
  onClose?: () => void;
}

export default function MyComponent({ userId, onClose }: MyComponentProps) {
  return <div>{userId}</div>;
}
```

**Using Hooks**:
- Always call hooks at top level of component
- Use `useAuth()` to access current user
- Use `useToast()` for notifications (via sonner)
- Query data with custom hooks from `src/hooks/`

**Conditional Rendering**:
- Use `LoadingState` component for loading states
- Use `EmptyState` component for empty lists
- Handle errors with `useToast()`

### Protection & Validation

**Authentication**:
- Wrap protected routes with `<RequireAuth>` component
- Admin-only routes use `<RequireAdmin>`
- Always check `user` before queries: `enabled: !!user`

**Forms**:
- Use React Hook Form + Zod for all forms
- Define Zod schemas in `src/lib/` or component file
- Show validation errors from `form.formState.errors`

### Shadcn UI Usage

Common components already installed:
- `Button`, `Input`, `Textarea`, `Select`, `Checkbox`, `Radio`
- `Card`, `Dialog`, `Sheet`, `Tabs`, `Accordion`
- `Avatar`, `Badge`, `Alert`, `Toast`, `Tooltip`

To add new components:
```bash
bunx shadcn@latest add component-name
```

### Supabase Integration Notes

- Auto-generated types live in `src/integrations/supabase/types.ts`
- Never manually edit types.ts—regenerate via Supabase CLI
- `client.ts` exports a configured Supabase client with:
  - localStorage persistence
  - Auto token refresh
  - TypeScript support

### Error Handling

Always use `useToast()` for errors:
```typescript
const { toast } = useToast();
try {
  // do something
} catch (error) {
  toast({
    variant: 'destructive',
    title: 'Error',
    description: error instanceof Error ? error.message : 'Something went wrong',
  });
}
```

### CSS & Styling

- Use Tailwind classes for styling (no manual CSS unless necessary)
- Component-level styles in co-located `.css` files (e.g., `App.css`)
- Global styles in `src/index.css`
- Theme support via `next-themes` (dark/light mode)

### Query Key Management

Use consistent, hierarchical query keys:
```typescript
queryKey: ['friends', userId]              // List of user's friends
queryKey: ['groups', cityId, 'nearby']     // Nearby groups in city
queryKey: ['messages', groupId]            // Messages in group
queryKey: ['group-detail', groupId]        // Single group details
```

## Testing

### Unit Tests (Vitest)

Location: `src/**/*.test.tsx` or `src/**/*.spec.tsx`

Run specific test:
```bash
bun test src/contexts/__tests__/AuthContext.test.tsx
```

Test file setup:
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('MyComponent', () => {
  it('should render', () => {
    render(<MyComponent />);
    expect(screen.getByText('...')).toBeInTheDocument();
  });
});
```

### E2E Tests (Playwright)

Location: `tests/e2e/*.spec.ts`

Configured to:
- Use headless Chrome by default
- Serve from `http://127.0.0.1:4173` (build preview server)
- Auto-start dev server or use existing one
- Retry failed tests in CI

Run headed (see browser):
```bash
bun test:e2e:headed
```

## Environment Setup

Create `.env` file (not committed):
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
```

Development server runs on `http://localhost:8080` with hot module replacement (HMR).

## MCP Servers

### Playwright Browser Automation (Recommended)

To enable Playwright MCP for browser-based testing and automation:

**VS Code + Cline extension**:
Add to your MCP settings (`~/.config/cline/mcp-settings.json` or similar):
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-playwright"]
    }
  }
}
```

This allows AI assistants to:
- Run and debug e2e tests directly
- Automate browser interactions for testing
- Help troubleshoot Playwright configuration issues

Restart your IDE/Cline after adding the MCP server.

## Common Tasks

### Add a New Protected Page

1. Create page in `src/pages/YourPage.tsx`
2. Add route in `src/App.tsx` with `<RequireAuth>` wrapper
3. Use `useAuth()` to access current user
4. Use custom hooks from `src/hooks/` for data

### Add a New Form

1. Define Zod schema: `const formSchema = z.object({ ... })`
2. Use React Hook Form: `const form = useForm<z.infer<typeof formSchema>>()`
3. Render with `<Form>` wrapper from Shadcn
4. Submit with `useMutation` hook

### Query Data from Supabase

1. Create custom hook in `src/hooks/useMyData.ts`
2. Use `useQuery()` with async Supabase query
3. Always check `enabled: !!user`
4. Import and use hook in component

### Handle Real-time Updates

Subscribe to Supabase changes:
```typescript
const subscription = supabase
  .on('postgres_changes', { 
    event: '*', 
    schema: 'public', 
    table: 'messages' 
  }, (payload) => {
    queryClient.invalidateQueries({ queryKey: ['messages'] });
  })
  .subscribe();

// Clean up on unmount
return () => subscription.unsubscribe();
```
