# Global Theme System - Implementation Guide

## Overview

The theme system has been refactored to use **React Context API** with **OOP principles**, making it globally available throughout the entire application.

---

## Architecture

### Components Created

1. **ThemeContext** (`shared/contexts/theme.context.tsx`)
   - Global theme state management
   - Theme persistence to localStorage
   - Automatic DOM class application

2. **ThemeProvider** (Class Component)
   - Wraps entire application
   - Manages theme state
   - Provides theme context to all children

3. **ThemeToggle** (Updated)
   - Consumes theme from context
   - No props needed

4. **useTheme Hook** (`shared/hooks/useTheme.ts`)
   - For functional components
   - Easy theme access

5. **withTheme HOC**
   - For class components
   - Injects theme context as prop

---

## File Structure

```
src/
├── shared/
│   ├── contexts/
│   │   └── theme.context.tsx       # Theme Context & Provider
│   ├── hooks/
│   │   └── useTheme.ts             # useTheme hook
│   ├── components/
│   │   └── theme.component.tsx     # ThemeToggle component
│   └── services/
│       └── storage.service.ts      # Storage service (existing)
├── App.tsx                          # Wrapped with ThemeProvider
└── modules/
    └── auth/
        └── login.page.tsx          # Uses theme from context
```

---

## Usage Examples

### 1. Class Components (Using Context)

```typescript
import { Component } from "react";
import { ThemeContext, IThemeContext } from "../../shared/contexts/theme.context";

class MyComponent extends Component {
  static contextType = ThemeContext;
  declare context: IThemeContext;

  render() {
    const { theme, toggleTheme, setTheme } = this.context;

    return (
      <div className={theme === "dark" ? "dark-mode" : "light-mode"}>
        <button onClick={toggleTheme}>Toggle Theme</button>
        <button onClick={() => setTheme("dark")}>Set Dark</button>
        <button onClick={() => setTheme("light")}>Set Light</button>
      </div>
    );
  }
}
```

### 2. Class Components (Using HOC)

```typescript
import { Component } from "react";
import { withTheme, IThemeContext } from "../../shared/contexts/theme.context";

interface MyComponentProps {
  theme?: IThemeContext;
}

class MyComponent extends Component<MyComponentProps> {
  render() {
    const { theme } = this.props.theme!;

    return (
      <div className={theme === "dark" ? "dark-mode" : "light-mode"}>
        Current theme: {theme}
      </div>
    );
  }
}

export default withTheme(MyComponent);
```

### 3. Functional Components (Using Hook)

```typescript
import { useTheme } from "../../shared/hooks/useTheme";

function MyComponent() {
  const { theme, toggleTheme, setTheme } = useTheme();

  return (
    <div className={theme === "dark" ? "dark-mode" : "light-mode"}>
      <button onClick={toggleTheme}>Toggle Theme</button>
      <button onClick={() => setTheme("dark")}>Set Dark</button>
      <p>Current theme: {theme}</p>
    </div>
  );
}
```

---

## API Reference

### ThemeContext Interface

```typescript
interface IThemeContext {
  theme: "light" | "dark";
  toggleTheme: () => void;
  setTheme: (theme: "light" | "dark") => void;
}
```

### ThemeProvider Props

```typescript
interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: "light" | "dark";  // Optional, defaults to "light"
}
```

### Methods

#### `toggleTheme()`
Toggles between light and dark theme.

```typescript
const { toggleTheme } = useTheme();
toggleTheme(); // Switches theme
```

#### `setTheme(theme)`
Sets a specific theme.

```typescript
const { setTheme } = useTheme();
setTheme("dark");  // Sets dark theme
setTheme("light"); // Sets light theme
```

---

## Features

### ✅ Global State
- Theme accessible from any component
- No prop drilling required
- Single source of truth

### ✅ Persistence
- Automatically saves to localStorage
- Restores theme on page reload
- Uses existing `storageService`

### ✅ DOM Integration
- Automatically applies `dark` class to `<html>`
- Sets `data-theme` attribute
- Works with Tailwind's dark mode

### ✅ OOP Principles
- **Single Responsibility**: Each class has one job
- **Encapsulation**: Private methods for internal logic
- **Dependency Injection**: Services injected via constructor
- **Type Safety**: Full TypeScript support

---

## Tailwind Dark Mode

The system automatically applies the `dark` class to the root element, enabling Tailwind's dark mode:

```css
/* Automatically works */
<div className="bg-white dark:bg-gray-900">
  <p className="text-gray-900 dark:text-gray-100">Text</p>
</div>
```

Ensure `tailwind.config.js` has:

```javascript
module.exports = {
  darkMode: 'class', // or 'media'
  // ...
}
```

---

## Migration Guide

### Before (Props-based)

```typescript
// App.tsx
class App extends Component<object, { theme: "light" | "dark" }> {
  state = { theme: "light" as "light" | "dark" };
  
  render() {
    return <LoginPage theme={this.state.theme} />;
  }
}

// LoginPage.tsx
interface LoginPageProps {
  theme: "light" | "dark";
}

class LoginPage extends Component<LoginPageProps> {
  render() {
    const { theme } = this.props;
    // ...
  }
}
```

### After (Context-based)

```typescript
// App.tsx
class App extends Component {
  render() {
    return (
      <ThemeProvider>
        <LoginPage />
      </ThemeProvider>
    );
  }
}

// LoginPage.tsx
class LoginPage extends Component {
  static contextType = ThemeContext;
  declare context: IThemeContext;
  
  render() {
    const { theme } = this.context;
    // ...
  }
}
```

---

## Benefits

### 1. No Prop Drilling
```typescript
// Before: Pass theme through multiple levels
<App theme={theme}>
  <Layout theme={theme}>
    <Page theme={theme}>
      <Component theme={theme} />
    </Page>
  </Layout>
</App>

// After: Access theme anywhere
<App>
  <Layout>
    <Page>
      <Component /> {/* Uses useTheme() or context */}
    </Page>
  </Layout>
</App>
```

### 2. Consistent State
- Single theme state for entire app
- No sync issues between components
- Automatic updates everywhere

### 3. Easy Testing
```typescript
import { ThemeProvider } from "./shared/contexts/theme.context";

// Test with specific theme
<ThemeProvider defaultTheme="dark">
  <ComponentToTest />
</ThemeProvider>
```

---

## Advanced Usage

### Custom Theme Toggle Button

```typescript
import { Component } from "react";
import { ThemeContext, IThemeContext } from "../contexts/theme.context";

class CustomToggle extends Component {
  static contextType = ThemeContext;
  declare context: IThemeContext;

  render() {
    const { theme, toggleTheme } = this.context;

    return (
      <button
        onClick={toggleTheme}
        className="p-2 rounded-lg bg-gray-200 dark:bg-gray-800"
      >
        {theme === "dark" ? "🌙" : "☀️"}
      </button>
    );
  }
}
```

### Theme-aware Component

```typescript
class Card extends Component {
  static contextType = ThemeContext;
  declare context: IThemeContext;

  render() {
    const { theme } = this.context;
    const isDark = theme === "dark";

    return (
      <div
        className={`
          p-4 rounded-lg
          ${isDark ? "bg-gray-800 text-white" : "bg-white text-gray-900"}
        `}
      >
        {this.props.children}
      </div>
    );
  }
}
```

### Conditional Rendering

```typescript
class Header extends Component {
  static contextType = ThemeContext;
  declare context: IThemeContext;

  render() {
    const { theme } = this.context;

    return (
      <header>
        {theme === "dark" ? (
          <img src="/logo-dark.png" alt="Logo" />
        ) : (
          <img src="/logo-light.png" alt="Logo" />
        )}
      </header>
    );
  }
}
```

---

## Troubleshooting

### Theme not persisting
**Check**: Ensure `storageService.theme._setTheme()` is working
**Solution**: Verify localStorage is enabled in browser

### Dark mode not applying
**Check**: Tailwind config has `darkMode: 'class'`
**Solution**: Update `tailwind.config.js`

### Context not available
**Check**: Component is wrapped in `<ThemeProvider>`
**Solution**: Ensure App.tsx has ThemeProvider at root

### TypeScript errors
**Check**: Proper type declarations
**Solution**: Use `declare context: IThemeContext` in class components

---

## Summary

### What Changed
- ❌ Removed theme prop from LoginPage
- ❌ Removed theme state from App component
- ✅ Added ThemeContext for global state
- ✅ Added ThemeProvider wrapper
- ✅ Added useTheme hook for functional components
- ✅ Added withTheme HOC for class components
- ✅ Updated ThemeToggle to use context

### Benefits
- ✅ Global theme access
- ✅ No prop drilling
- ✅ Automatic persistence
- ✅ Type-safe
- ✅ OOP principles
- ✅ Easy to test
- ✅ Scalable

---

**Status**: ✅ COMPLETE

The theme system is now globally available throughout the entire application!
