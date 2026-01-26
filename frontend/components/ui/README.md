# Sarnies Loyalty UI Component Library
## 2026 Enterprise-Grade Design System

### Overview
Premium, accessible, mobile-first component library built for the Sarnies Loyalty Platform. Every component adheres to top 1% design standards with polished micro-interactions, smooth animations, and exceptional user experience.

---

## 🎨 Design Principles

1. **Performance First** - All animations 100ms, interactions feel instant
2. **Mobile-First** - Touch-optimized with 44px minimum tap targets
3. **Accessibility** - WCAG 2.1 AA compliant, full keyboard navigation
4. **Consistency** - Unified design language across all components
5. **Premium Feel** - Subtle gradients, shadows, and micro-interactions

---

## 📦 Components

### Button
**Purpose**: Primary interactive element for user actions

**Features**:
- 7 variants: primary, secondary, success, danger, ghost, admin-primary, admin-secondary
- 3 sizes: sm (xs text), md (sm text), lg (base text)
- Gradient backgrounds for primary actions (black → gray-800)
- Press-scale micro-interaction on all variants
- Loading state with spinner
- Full-width option
- Focus ring with 2px offset
- Disabled state with 40% opacity

**Usage**:
```tsx
import Button from '@/components/ui/Button';

<Button variant="primary" size="md" loading={false} fullWidth={false}>
  Save Changes
</Button>
```

### Card
**Purpose**: Container component for grouped content

**Features**:
- 4 variants: default, bordered, elevated, admin
- 4 padding sizes: none, sm (4), md (6), lg (8)
- Rounded-xl borders (12px)
- Hover shadow elevation (sm → md)
- 100ms transitions
- Border with gray-100/200

**Usage**:
```tsx
import Card from '@/components/ui/Card';

<Card variant="default" padding="md">
  <h3>Card Title</h3>
  <p>Card content...</p>
</Card>
```

### Badge
**Purpose**: Status indicators and category tags

**Features**:
- 12 variants: neutral, freeItem, discount, promotion, featured, statusActive, statusInactive, + 6 legacy
- Gradient backgrounds for all variants
- Rounded-full shape
- 22px height with semibold text
- Status variants include animated dot indicator
- Border for definition
- Transition-all for smooth state changes

**Usage**:
```tsx
import { Badge } from '@/components/ui/Badge';

<Badge variant="featured" label="Featured" />
<Badge variant="statusActive" label="Active" />
<Badge variant="freeItem">Free Coffee</Badge>
```

### Table
**Purpose**: Tabular data display with sortable columns

**Features**:
- Rounded-xl container with border
- Gray-50 header background
- Hover row highlighting (gray-50)
- Press-scale on clickable rows
- 100ms transitions
- Responsive overflow-x-auto
- Alignment options (left, center, right)
- Divide-y borders between rows

**Components**: Table, TableHead, TableBody, TableRow, TableHeader, TableCell

**Usage**:
```tsx
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/ui/Table';

<Table>
  <TableHead>
    <TableRow>
      <TableHeader>Name</TableHeader>
      <TableHeader align="right">Amount</TableHeader>
    </TableRow>
  </TableHead>
  <TableBody>
    <TableRow onClick={() => {}}>
      <TableCell>John Doe</TableCell>
      <TableCell align="right">$100</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### StatusBadge
**Purpose**: Active/inactive status indicator with dot

**Features**:
- Gradient backgrounds (green for active, gray for inactive)
- Animated dot with shadow (green-500 with shadow-green-300)
- Rounded-full shape
- Custom active/inactive labels
- 100ms transitions

**Usage**:
```tsx
import StatusBadge from '@/components/ui/StatusBadge';

<StatusBadge active={true} activeLabel="Online" inactiveLabel="Offline" />
```

### AvatarCircle
**Purpose**: User initials avatar display

**Features**:
- Gradient background (gray-200 → gray-100)
- Border with gray-300
- Shadow-sm with hover → shadow-md
- Configurable size (default 32px)
- Auto-scaled font size (37.5% of size)
- Bold text styling

**Usage**:
```tsx
import { AvatarCircle } from '@/components/ui/AvatarCircle';

<AvatarCircle initials="JD" size={48} />
```

### FilterChip
**Purpose**: Filter selection toggle buttons

**Features**:
- Active state: gradient black background with white text
- Inactive state: white with hover border change
- Press-scale interaction
- Rounded-xl shape (12px)
- Shadow elevation (sm → md)
- 100ms transitions
- Font-semibold for clarity

**Usage**:
```tsx
import { FilterChip } from '@/components/ui/FilterChip';

<FilterChip label="All" active={true} onClick={() => {}} />
<FilterChip label="Active" active={false} onClick={() => {}} />
```

### Alert
**Purpose**: Page-level notifications with auto-dismiss and stacking support

**Features**:
- 4 variants: success, error, warning, info
- Auto-dismiss with configurable delay (default 5s)
- Smooth slide-up animation
- Gradient backgrounds with subtle backdrop blur
- Optional close button
- Accessible (role="alert", aria-live="polite")

**Usage**:
```tsx
import { Alert } from '@/components/ui/Alert';

<Alert
  variant="success"
  title="Success!"
  message="Your changes have been saved"
  onClose={() => {}}
  autoDismiss={true}
  dismissDelay={5000}
/>
```

### AlertStack (Provider)
**Purpose**: Global alert management system with automatic stacking

**Features**:
- Context-based alert management
- Stacked alerts with staggered animations
- Automatic overflow management (max 3 by default)
- 6 position options (top-right, top-left, etc.)
- Helper methods: `success()`, `error()`, `warning()`, `info()`

**Usage**:
```tsx
// In layout or provider
import { AlertProvider } from '@/components/ui/AlertStack';

<AlertProvider maxAlerts={3} position="top-right">
  {children}
</AlertProvider>

// In components
import { useAlerts } from '@/components/ui/AlertStack';

const { success, error } = useAlerts();
success('Payment processed successfully');
error('Failed to process payment', 'Payment Error');
```

### SearchInput
**Purpose**: Reusable search field with clear button

**Features**:
- Animated search icon (gray → black on focus)
- Clear button appears when value exists
- Press-scale micro-interaction on clear button
- Shadow elevation on hover (sm → md)
- Rounded-xl with smooth transitions

**Usage**:
```tsx
import { SearchInput } from '@/components/ui/SearchInput';

<SearchInput
  value={searchQuery}
  onChange={setSearchQuery}
  placeholder="Search vouchers..."
  onClear={() => console.log('cleared')}
  autoFocus={true}
/>
```

### Pagination
**Purpose**: Navigate through multi-page data sets

**Features**:
- Smart ellipsis logic (shows "..." when needed)
- Gradient active page button (black → gray-800)
- Configurable max page numbers (default 5)
- Disabled state with reduced opacity (40%)
- Press-scale on all interactive elements
- Stroke-width 2.5 for crisp chevrons

**Usage**:
```tsx
import { Pagination } from '@/components/ui/Pagination';

<Pagination
  currentPage={currentPage}
  totalPages={totalPages}
  onPageChange={setCurrentPage}
  showPageNumbers={true}
  maxPageNumbers={5}
/>
```

### FilterBar
**Purpose**: Advanced filtering interface with search, dropdowns, and active filter tags

**Features**:
- Integrated SearchInput component
- Multiple filter dropdowns with rounded-xl styling
- Active filter pill tags with gradient backgrounds
- Animated fade-in for filter tags
- "Clear All" button appears when filters active
- Mobile-responsive (stacks on small screens)

**Usage**:
```tsx
import { FilterBar } from '@/components/ui/FilterBar';

<FilterBar
  searchValue={search}
  onSearchChange={setSearch}
  searchPlaceholder="Search users..."
  filters={[
    {
      key: 'role',
      label: 'Role',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Staff', value: 'staff' },
      ],
      value: selectedRole,
    },
  ]}
  onFilterChange={(key, value) => handleFilterChange(key, value)}
  activeFilters={[{ key: 'role', label: 'Role', value: 'admin' }]}
  onClearFilter={(key) => handleClearFilter(key)}
  onClearAll={() => handleClearAll()}
/>
```

### Toggle
**Purpose**: Switch component for boolean settings

**Features**:
- Gradient background (black → gray-800 when enabled)
- Shadow-md on hover
- 200ms smooth transition
- Disabled state with opacity 50%
- Press-scale interaction
- Accessible (role="switch", aria-checked)

**Variants**:
- `Toggle` - Base switch component
- `ToggleWithLabel` - Switch with label and optional description

**Usage**:
```tsx
import { Toggle, ToggleWithLabel } from '@/components/ui/Toggle';

<Toggle
  enabled={enabled}
  onChange={setEnabled}
  label="Email notifications"
/>

<ToggleWithLabel
  enabled={darkMode}
  onChange={setDarkMode}
  label="Dark Mode"
  description="Enable dark theme across the application"
/>
```

### Tooltip
**Purpose**: Contextual help text on hover/focus

**Features**:
- 4 positions: top, bottom, left, right
- Configurable delay (default 200ms)
- Arrow pointer for direction
- Slide-up animation
- Backdrop blur for depth
- Keyboard accessible (shows on focus)
- Max-width constraint for long text

**Usage**:
```tsx
import { Tooltip } from '@/components/ui/Tooltip';

<Tooltip content="Delete user permanently" position="top" delay={200}>
  <button>
    <Trash2 className="w-5 h-5" />
  </button>
</Tooltip>
```

### FormField, Input, Textarea, Select
**Purpose**: Form inputs with built-in validation and error display

**Features**:
- Unified error styling (red borders, error messages)
- Required field indicator (red asterisk)
- Helper text support
- Multiple error messages
- Shadow elevation on hover
- Focus ring (black for normal, red for errors)
- Rounded-xl borders
- Error icons with AlertCircle

**Usage**:
```tsx
import { FormField, Input, Textarea, Select } from '@/components/ui/FormField';

<FormField
  label="Email Address"
  name="email"
  error={errors.email}
  required={true}
  helperText="We'll never share your email"
>
  <Input
    type="email"
    name="email"
    placeholder="you@example.com"
    error={!!errors.email}
  />
</FormField>

<FormField label="Role" name="role">
  <Select name="role">
    <option value="">Select role...</option>
    <option value="admin">Admin</option>
    <option value="staff">Staff</option>
  </Select>
</FormField>
```

### Validation Utilities
**Purpose**: Type-safe form validation with reusable rules

**Features**:
- 10+ built-in rules: required, email, phone, minLength, maxLength, min, max, pattern, oneOf, custom
- Field-level and form-level validation
- TypeScript support for type safety
- Helper hook: `useValidation()`

**Usage**:
```tsx
import { validationRules, validateForm } from '@/lib/validation';

const rules = {
  email: [
    validationRules.required(),
    validationRules.email(),
  ],
  password: [
    validationRules.required(),
    validationRules.minLength(8, 'Password must be at least 8 characters'),
  ],
  age: [
    validationRules.min(18, 'Must be 18 or older'),
    validationRules.max(100),
  ],
};

const { valid, errors } = validateForm(formValues, rules);
```

### SkeletonLoader
**Purpose**: Loading state placeholders

**Features**:
- Shimmer animation (2s infinite loop)
- 3 variants: text, circular, rectangular
- Pre-built patterns: SkeletonCard, SkeletonTable, SkeletonList, SkeletonProfile
- Accessible (role="status", aria-label="Loading...")

**Usage**:
```tsx
import { Skeleton, SkeletonCard, SkeletonTable } from '@/components/ui/SkeletonLoader';

// Custom skeleton
<Skeleton variant="rectangular" width={200} height={100} />

// Pre-built patterns
<SkeletonCard />
<SkeletonTable rows={5} />
<SkeletonList items={3} />
<SkeletonProfile />
```

---

## 🎭 Animation System

### Keyframes
- `fadeIn` - 0.8s ease-in opacity fade
- `slideUp` - 0.6s ease-out vertical slide with fade
- `shake` - 0.4s horizontal shake (error feedback)
- `bounceIn` - 0.6s scale bounce with overshoot
- `slideInRight` - Alert stack entrance from right
- `slideInLeft` - Alert stack entrance from left
- `scaleIn` - Generic scale-up entrance
- `shimmer` - 2s infinite skeleton loading

### Utility Classes
- `.hover-lift` - Subtle -0.5px lift on hover (100ms)
- `.press-scale` - scale(0.98) on active press
- `.expand-hover` - scale(1.02) on hover
- `.focus-ring` - Brand-primary 2px ring with 1px offset
- `.animate-fade-in` - Apply fadeIn animation
- `.animate-slide-up` - Apply slideUp animation
- `.animate-shake` - Apply shake animation
- `.animate-bounce-in` - Apply bounceIn animation

---

## 🎨 Design Tokens

### Border Radius
- Inputs, cards: `rounded-xl` (12px)
- Buttons: `rounded-xl` (12px)
- Pills, tags: `rounded-full`
- Tooltips: `rounded-lg` (8px)

### Shadows
- Resting: `shadow-sm`
- Hover: `shadow-md`
- Active/Selected: `shadow-md`
- Tooltips: `shadow-lg`

### Transitions
- Interactive elements: `duration-100` (100ms)
- State changes: `duration-200` (200ms)
- Skeleton shimmer: `2s infinite`

### Focus States
- Primary: `ring-2 ring-black`
- Error: `ring-2 ring-red-500`
- Info: `ring-2 ring-blue-500`
- Ring offset: `ring-offset-2`

### Typography
- Small text: `text-xs` (12px)
- Body text: `text-sm` (14px)
- Labels: `font-semibold`
- Buttons: `font-semibold`
- Tooltips: `font-medium`

### Gradients
- Success: `from-green-50 to-emerald-50`
- Error: `from-red-50 to-rose-50`
- Warning: `from-yellow-50 to-amber-50`
- Info: `from-blue-50 to-indigo-50`
- Active button: `from-black to-gray-800`
- Toggle enabled: `from-black to-gray-800`

---

## ♿ Accessibility

### ARIA Support
- All interactive elements have `aria-label`
- Alerts use `role="alert"` and `aria-live="polite"`
- Toggles use `role="switch"` and `aria-checked`
- Tooltips use `role="tooltip"`
- Skeletons use `role="status"`
- Pagination uses `aria-current="page"`

### Keyboard Navigation
- All components fully keyboard navigable
- Tooltips show on focus (not just hover)
- Focus visible with ring indicators
- Tab order follows visual order

### Touch Targets
- Minimum 44px tap targets on mobile
- Press-scale feedback for tactile response
- Hover states don't interfere on touch devices

---

## 📱 Mobile Responsiveness

### Breakpoints
- FilterBar stacks on `sm` (640px)
- Pagination adjusts spacing on mobile
- Tooltips auto-position to stay on screen
- Touch-optimized interactions (press-scale)

### Performance
- All animations use GPU-accelerated properties (transform, opacity)
- No layout thrashing or reflows
- Optimized re-renders with React.memo where needed
- Lazy loading for heavy components

---

## 🚀 Usage Guidelines

### Import Pattern
```tsx
// Named imports for tree-shaking
import { Alert } from '@/components/ui/Alert';
import { SearchInput } from '@/components/ui/SearchInput';
import { useAlerts } from '@/components/ui/AlertStack';
```

### Combining Components
```tsx
// Example: Filterable table with pagination
<FilterBar {...filterProps} />
<Table data={filteredData} />
<Pagination {...paginationProps} />
```

### Global Setup
```tsx
// app/layout.tsx
import { AlertProvider } from '@/components/ui/AlertStack';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AlertProvider position="top-right" maxAlerts={3}>
          {children}
        </AlertProvider>
      </body>
    </html>
  );
}
```

---

## 🎯 Best Practices

1. **Always use semantic HTML** - Buttons for actions, links for navigation
2. **Provide aria-labels** - Especially for icon-only buttons
3. **Use FormField wrapper** - For consistent error handling
4. **Leverage validation utilities** - Don't write custom validators
5. **Test keyboard navigation** - Tab through all interactive elements
6. **Check mobile touch targets** - Use browser DevTools mobile emulation
7. **Monitor animation performance** - Use Chrome DevTools Performance tab
8. **Use Skeleton loaders** - For all loading states, not spinners

---

## 🔮 Future Enhancements

- Dark mode variants for all components
- Date range picker component
- Advanced table with sorting/filtering
- Modal/Dialog component
- Dropdown menu component
- File upload component
- Multi-select component
- Color picker component
- Rich text editor integration

---

---

## 📊 Component Summary

**Total Components**: 16
- **Core UI**: Button, Card, Badge, Table, StatusBadge, AvatarCircle, FilterChip
- **Forms**: FormField, Input, Textarea, Select, SearchInput, Toggle
- **Navigation**: Pagination
- **Feedback**: Alert, AlertStack, Tooltip
- **Loading**: SkeletonLoader
- **Utilities**: Validation library

**Design Tokens**: Consistent across all components
- Border radius: 12px (rounded-xl) for most components, rounded-full for badges/pills
- Shadows: sm (resting) → md (hover) → lg (active/selected)
- Transitions: 100ms for interactions, 200ms for state changes
- Gradients: Consistent color pairs (black → gray-800, green-50 → emerald-50, etc.)
- Typography: xs (12px), sm (14px), base (16px) with semibold/bold weights

**Interaction Patterns**:
- Press-scale on all interactive elements
- Focus rings with 2px width and offset
- Hover shadow elevations
- 40% opacity for disabled states
- Smooth 100ms transitions

---

**Built with ❤️ for Sarnies Loyalty Platform**
**Last Updated**: 2025-01-29
**Design System Version**: 2.0.0
**Total Components**: 16
