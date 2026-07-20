'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

const ThemeToggle = () => {
    const { setTheme, resolvedTheme } = useTheme();

    return (
        <button
            type="button"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="theme-toggle"
            title="Toggle theme"
        >
            {/* Both icons always render and the `dark:` variant decides which is
                visible. Rendering is therefore identical on server and client,
                so there is no hydration mismatch and no icon flash on load. */}
            <Moon className="theme-toggle-icon rotate-0 scale-100 dark:-rotate-90 dark:scale-0" />
            <Sun className="theme-toggle-icon -rotate-90 scale-0 dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
        </button>
    );
};

export default ThemeToggle;
