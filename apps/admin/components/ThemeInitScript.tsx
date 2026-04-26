export const THEME_STORAGE_KEY = 'eventaat-admin-theme' as const;

/**
 * Runs before paint so `dark` class is applied to avoid a light flash when the user chose dark.
 * Must stay in sync with `THEME_STORAGE_KEY` and `AdminThemeToggle` logic.
 */
const SCRIPT = `(()=>{try{var k="${THEME_STORAGE_KEY}";var v=localStorage.getItem(k);var d=document.documentElement;if(v==="dark")d.classList.add("dark");else d.classList.remove("dark");}catch(e){}})();`;

export function ThemeInitScript() {
  return (
    <script
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: SCRIPT }}
    />
  );
}
